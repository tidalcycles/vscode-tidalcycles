import * as vscode from 'vscode';
import { ITidal } from './tidal';
import { TidalEditor, TidalExpression } from './editor';
import { IHistory } from './history';
import { DecorationRenderOptions, TextEditorDecorationType } from 'vscode';
import { Config } from './config';

/**
 * Provides the UI commands for an interactive Tidal session.
 */
export interface IRepl {
    hush(): Promise<void>;
    evaluate(isMultiline: boolean): Promise<void>;
}

export const DEFAULT_TEMPLATE_MARKER = RegExp(/[#](s|c)[#]/g);

export class Repl implements IRepl {
    public readonly postChannel: vscode.OutputChannel | null = null;

    constructor(private tidal: ITidal, 
        private textEditor: vscode.TextEditor, private history: IHistory, 
        private config: Config, 
        private createTextEditorDecorationType: (_: DecorationRenderOptions) => TextEditorDecorationType) {
    }

    private editingTidalFile(): boolean {
        return this.textEditor.document.fileName.endsWith('.tidal');
    }

    public async hush() {
        if (!this.editingTidalFile()) {
            return;
        }

        await this.tidal.sendTidalExpression('hush');
        this.history.log(new TidalExpression('hush', new vscode.Range(0, 0, 0, 0)));
    }

    public async executeTemplate(template: string, marker=DEFAULT_TEMPLATE_MARKER, echoCommandToLogger: boolean=false) {
        if (!this.editingTidalFile()) { 
            return; 
        }

        let block = new TidalEditor(this.textEditor).getTidalExpressionUnderCursor(true);
        let range = new vscode.Range(0,0,0,0);
        const replacements: ({[key:string]:string}) = {};

        if(template.search(marker) >= 0){
            if(block === null){
                vscode.window.showErrorMessage(`    Command template contains markers but
                                                    there is no valid code block at the
                                                    cursor location: ${template}`
                );
                return;
            }
            else {
                let valueFound = false;
                Object.entries(extractTemplateValues(block.expression)).forEach(([key, value]) => {
                    valueFound = true;
                    replacements[key] = value;
                });

                if(valueFound) {
                    range = block.range;
                }
            }
        }

        template = replaceTemplateValues(template, replacements, marker);
        block = new TidalExpression(template, range);

        this.evaluateExpression(block, true, echoCommandToLogger);
    }

    public async evaluate(isMultiline: boolean, echoCommandToLogger: boolean=false) {
        if (!this.editingTidalFile()) { 
            return; 
        }

        const block = new TidalEditor(this.textEditor).getTidalExpressionUnderCursor(isMultiline);
        
        this.evaluateExpression(block, isMultiline, echoCommandToLogger);
    }

    public async evaluateExpression(block:TidalExpression | null,isMultiline: boolean, echoCommandToLogger: boolean=false) {
        if (!this.editingTidalFile()) { 
            return; 
        }
        
        if (block) {
            await this.tidal.sendTidalExpression(block.expression, echoCommandToLogger);
            this.feedback(block.range);
            this.history.log(block);
        }
    }

    private feedback(range: vscode.Range): void {
        const flashDecorationType = this.createTextEditorDecorationType({
            backgroundColor: this.config.feedbackColor()
        });
        this.textEditor.setDecorations(flashDecorationType, [range]);
        setTimeout(function () {
            flashDecorationType.dispose();
        }, 250);
    }

}

export function extractTemplateValues(s: string): ({[key:string]:string}) {
    const values:({[key:string]:string}) = {};

    let m = s.match(/^d([0-9]+)(?:[^a-zA-Z0-9_].*)?$/s);
                
    if(m !== null && m.length > 0){
        values["s"] = m[1];
    }
    else {
        const transitions = [
            'xfade', 'anticipate', 'clutch', 'interpolate'
            , 'jump', 'jumpMod', 'histpan', 'mortal', 'wait', 'waitT'
            , 'wash'
        ].map(x => ['','In','\''].map(y => x+y))
        .reduce((x, y) => {y.forEach(z => x.push(z)); return x;}, []);
        
        const m2 = s.match(/^\s*(\S+)\s+(\S+)\s/s);

        if(m2 !== null && m2.length > 0){
            if(transitions.filter(x => x === m2[1]).length > 0){
                values["s"] = m2[2];
            }
        }
    }

    m = s.match(/^.+?[$#](.*)$/s);

    if(m !== null && m.length > 0){
        values["c"] = m[1];
    }

    return values;
}

export function replaceTemplateValues(s: string, values:{[key:string]:string}, marker: RegExp): string {
    let m;
    let marker2 = new RegExp(marker);

    while((m = marker2.exec(s)) !== null){
        let v = values[m[1]];
        if(typeof v === 'undefined'){
            marker2.lastIndex = marker2.lastIndex - m[0].length + 1;
        }
        else {
            s = s.substr(0, marker2.lastIndex - m[0].length) + v + s.substr(marker2.lastIndex);
            marker2.lastIndex = 0;
        }
    }

    return s;
}

interface ICommandInfo {
    cmd: string;
    range?: vscode.Range;
}

export function splitCommands(
        commands: string | ICommandInfo | (string | ICommandInfo)[]
    ): TidalExpression[] {

    if(typeof commands === 'string' || (typeof commands === 'object' && !Array.isArray(commands))) {
        commands = [commands];
    }
    if(commands.length === 0) {
        return [];
    }

    const normalizedCommands = commands.map(x => typeof x === 'string' ? ({cmd: x}) : x);

    return normalizedCommands.map(command => {
        /*
        this is a pragmatic way of splitting a list of commands into
        distinct top level commands to executem them separately in
        GHCi. The idea is that every time there's a not-indented
        line, then all previous, unexecuted liens are executed up to
        that line.
        */

        const lines = command.cmd.split(/\r?\n/);
        let startLine = 0;
        
        const expressions:TidalExpression[] = [];

        for(let i=0;i<lines.length;i++){
            if(lines[i].length === 0){
                continue;
            }
            let c = lines[i].charAt(0);
            let m = c.match(/\S/);
            let isEmpty = typeof m === 'undefined' || m === null || m.length === 0;
            if(i !== lines.length - 1){
                if(isEmpty){
                    continue;
                }
            }
            let currentCommand = lines.slice(startLine, i+1).reduce((x,y)=>x+"\r\n"+y);
            startLine = i+1;

            let commandRange = typeof command.range === 'undefined' ? new vscode.Range(0, 0, 0, 0) : command.range;
            expressions.push(new TidalExpression(currentCommand, commandRange));
        }
        return expressions;
    })
    .reduce((x, y) => {y.forEach(z => x.push(z)); return x;}, []);
}