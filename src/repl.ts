import { getProcess } from './getProcess';

export const send = (command: string) => {
    const proc = getProcess();
    proc.stdin.write(command);
    proc.stdin.write('\n');
};

export const quit = () => {
    const proc = getProcess();
    proc.kill();
}

