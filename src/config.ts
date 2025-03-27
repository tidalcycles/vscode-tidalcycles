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

    public getExtensionId(){
        return "tidalcycles.vscode-tidalcycles";
    }

    public getPreferencesStringFor(s: string){
        return `${this.configSection}.${s}`;
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

    public evalCountPrefix(): string {
        return this.getConfiguration(this.configSection).get('evalCountPrefix', 'Evals: ');
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

    public randomMessageProbability(): number {
        return parseFloat(this.getConfiguration(this.configSection)
            .get('randomMessageProbability', '0'));
    }

    public randomMessages(): string[] {
        return this.getConfiguration(this.configSection).get('randomMessages', [])
    }

    public getSoundsPaths(): string[] {
        return this.getConfiguration(this.configSection).get('sounds.paths', []);
    }
    
    public getExtraCommandsFiles(): string[] {
        return this.getConfiguration(this.configSection).get<string[]>("codehelp.commands.extra", []);
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

    public getPlaySoundOnSelection(){
        return this.getConfiguration(this.configSection).get('sounds.playonselection', true);
    }
}