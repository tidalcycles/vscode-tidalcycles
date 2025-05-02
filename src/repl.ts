import { getProcess } from './getProcess';

export const send = (command: string) => {
  const lines = command.split('\n');
  const proc = getProcess();
  proc.stdin.write(':{\n');
  lines.forEach((line) => {
    proc.stdin.write(line);
    proc.stdin.write('\n');
  });
  proc.stdin.write(':}\n');
};

export const quit = () => {
  const proc = getProcess();
  proc.kill();
};
