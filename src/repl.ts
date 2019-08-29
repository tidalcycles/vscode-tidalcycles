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

    public async executeTemplate(template: string, replaceWithStreamNo=/[#]s[#]/g) {
        if (!this.editingTidalFile()) { 
            return; 
        }

        let block = new TidalEditor(this.textEditor).getTidalExpressionUnderCursor(true);
        let range = new vscode.Range(0,0,0,0);
        let streamNo = undefined;

        if(template.search(replaceWithStreamNo) >= 0){
            if(block === null){
                vscode.window.showErrorMessage(`    Could not determine stream number from current 
                                                    selection for command template: ${template}`
                );
                return;
            }
            else {
                let m = block.expression.match(/^d([0-9]+)(?:[^a-zA-Z0-9].*)?$/s);
                
                if(m !== null && m.length > 0){
                    range = block.range;
                    streamNo = m[1];
                }
            }
        }

        block = new TidalExpression(
            typeof streamNo === 'undefined' ? template : template.replace(replaceWithStreamNo, streamNo)
            , range
        );

        this.evaluateExpression(block, true);
    }

    public async evaluate(isMultiline: boolean) {
        if (!this.editingTidalFile()) { 
            return; 
        }

        const block = new TidalEditor(this.textEditor).getTidalExpressionUnderCursor(isMultiline);
        
        this.evaluateExpression(block, isMultiline);
    }

    public async evaluateExpression(block:TidalExpression | null,isMultiline: boolean) {
        if (!this.editingTidalFile()) { 
            return; 
        }
        
        if (block) {
            await this.tidal.sendTidalExpression(block.expression);
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