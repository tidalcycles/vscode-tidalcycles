import { OutputChannel, window } from 'vscode';

let outputChannel: OutputChannel;

const getOutputChannel = () => {
    if (!outputChannel) {
        outputChannel = window.createOutputChannel('TidalCycles');
        outputChannel.show();
    }

    return outputChannel;
};

export const write = (message: string) => {
    getOutputChannel().append(message);
};

export const writeLine = (message: string) => {
    write(`${message}\n`);
};
