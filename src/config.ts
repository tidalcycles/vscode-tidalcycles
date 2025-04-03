import * as vscode from 'vscode';
import { CodeHelpDetailLevel } from './codehelp';

const getConfiguration = vscode.workspace.getConfiguration;
const configSection = 'tidalcycles';

export const bootTidalPath = (): string | null => {
  return getConfiguration(configSection).get('bootTidalPath', null);
};

export const feedbackColor = () => {
  return getConfiguration(configSection).get(
    'feedbackColor',
    'rgba(100,250,100,0.3)'
  );
};

export const ghciPath = () => {
  return getConfiguration(configSection).get('ghciPath', 'ghci');
};

export const consolePrompt = () => {
  return getConfiguration(configSection).get('consolePrompt', 't');
};

// todo: delete this class in favor of functions
export class Config {
  readonly getConfiguration = vscode.workspace.getConfiguration;
  readonly configSection: string = 'tidalcycles';

  constructor() {}

  public useStackGhci(): boolean {
    return this.getConfiguration(this.configSection).get('useStackGhci', false);
  }

  public getExtraCommandsFiles(): string[] {
    return this.getConfiguration(this.configSection).get<string[]>(
      'codehelp.commands.extra',
      []
    );
  }

  public getHoverHelpDetailLevel(): CodeHelpDetailLevel {
    const level = this.getConfiguration(this.configSection).get(
      'codehelp.hover.level',
      CodeHelpDetailLevel[CodeHelpDetailLevel.FULL] as string
    );
    return this.stringToCodeHelpDetailLevel(level);
  }

  public getCompletionHelpDetailLevel(): CodeHelpDetailLevel {
    const level = this.getConfiguration(this.configSection).get(
      'codehelp.completion.level',
      CodeHelpDetailLevel[CodeHelpDetailLevel.FULL] as string
    );
    return this.stringToCodeHelpDetailLevel(level);
  }

  public stringToCodeHelpDetailLevel(level: string) {
    level = level.toUpperCase().replace(/\s+/g, '_');

    let enumLevel: CodeHelpDetailLevel | undefined = CodeHelpDetailLevel.FULL;
    try {
      enumLevel = CodeHelpDetailLevel[<keyof typeof CodeHelpDetailLevel>level];
      if (typeof enumLevel === 'undefined') {
        enumLevel = CodeHelpDetailLevel.FULL;
      }
    } catch (error) {
      vscode.window.showErrorMessage(
        'Could not convert ' + level + ' to CodeHelpDetailLevel: ' + error
      );
    }
    return enumLevel;
  }

  public getPlaySoundOnSelection() {
    return this.getConfiguration(this.configSection).get(
      'sounds.playonselection',
      true
    );
  }
}
