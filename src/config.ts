import * as vscode from 'vscode';
import { CodeHelpDetailLevel } from './codehelp';

export class Config {
    getConfiguration = vscode.workspace.getConfiguration;
    configSection: string = 'tidalcycles';

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