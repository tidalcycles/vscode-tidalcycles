import * as vscode from 'vscode';
import { CodeHelpDetailLevel } from './codehelp';

export class Config {
    readonly getConfiguration = vscode.workspace.getConfiguration;
    readonly configSection: string = 'tidalcycles';
    private workspaceState: vscode.Memento;

    constructor(
        private readonly context: vscode.ExtensionContext
    ){
        this.workspaceState = this.context.workspaceState;
    }

    public getWorkspaceState<T>(key: string){
        return this.workspaceState.get<T>(`${this.configSection}.${key}`);
    }

    public updateWorkspaceState(key:string, value: any){
        return this.workspaceState.update(`${this.configSection}.${key}`, value);
    }

    public bootTidalPath(): string | null {
        return this.getConfiguration(this.configSection).get('bootTidalPath', null);
    }

    public feedbackColor(): string {
        return this.getConfiguration(this.configSection).get('feedbackColor', 'rgba(100,250,100,0.3)');
    }

    public ghciPath(): string {
        return this.getConfiguration(this.configSection).get('ghciPath', 'ghci');
    }

    public showEvalCount(): boolean {
        return this.getConfiguration(this.configSection).get('showEvalCount', false);
    }

    public showGhciOutput(): boolean {
        return this.getConfiguration(this.configSection).get('showGhciOutput', false);
    }

    public showOutputInConsoleChannel(): boolean {
        return this.getConfiguration(this.configSection).get('showOutputInConsoleChannel', false);
    }

    public useBootFileInCurrentDirectory(): boolean {
        return this.getConfiguration(this.configSection).get('useBootFileInCurrentDirectory', false);
    }

    public useStackGhci(): boolean {
        return this.getConfiguration(this.configSection).get('useStackGhci', false);
    }

    public getShortcutCommand(num: number): string {
        return this.getConfiguration(this.configSection).get(`shortcuts.no${num}`, "");
    }

    public showShortcutCommandInConsole(): boolean {
        return this.getConfiguration(this.configSection).get('shortcuts.showInConsole', false);
    }

    public getDirtSamplesDirectories(): string[] {
        return this.getConfiguration(this.configSection).get('samples.directories', []);
    }
    
    public getHoverHelpDetailLevel(): CodeHelpDetailLevel {
        let level = this.getConfiguration(this.configSection)
            .get("codehelp.hover.level", CodeHelpDetailLevel[CodeHelpDetailLevel.FULL] as string);
        return this.stringToCodeHelpDetailLevel(level);
    }

    public getCompletionHelpDetailLevel(): CodeHelpDetailLevel {
        let level = this.getConfiguration(this.configSection)
            .get("codehelp.completion.level", CodeHelpDetailLevel[CodeHelpDetailLevel.FULL] as string);
        return this.stringToCodeHelpDetailLevel(level);
    }

    public stringToCodeHelpDetailLevel(level:string){
        level = level.toUpperCase().replace(/\s+/g,'_');

        let enumLevel:CodeHelpDetailLevel | undefined = CodeHelpDetailLevel.FULL;
        try {
            enumLevel = CodeHelpDetailLevel[<keyof typeof CodeHelpDetailLevel>level];
            if(typeof enumLevel === 'undefined'){
                enumLevel = CodeHelpDetailLevel.FULL;
            }
        }
        catch(error){
            vscode.window.showErrorMessage("Could not convert "+level+" to CodeHelpDetailLevel: "+error);
        }
        return enumLevel;
    }
}