import { LogOutputChannel, window } from 'vscode';

let outputChannel: LogOutputChannel;

const getOutputChannel = () => {
  if (!outputChannel) {
    outputChannel = window.createOutputChannel('TidalCycles', { log: true });
    outputChannel.show();
  }

  return outputChannel;
};

export const info = (message: string) => {
  getOutputChannel().append(message);
};

export const error = (message: string) => {
  getOutputChannel().error(message);
};
