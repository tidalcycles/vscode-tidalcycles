import * as path from 'path';
import * as fs from 'fs';
import * as child_process from 'child_process';
import { getTidalBootPath } from './getTidalBootPath';
import { getGhciBasePath } from './getGhciBasePath';
import { info, error } from './logger';

let proc: child_process.ChildProcessWithoutNullStreams;

const stdOut: string[] = [];
const stdErr: string[] = [];

export const getProcess = (): child_process.ChildProcessWithoutNullStreams => {
  if (!proc) {
    const tidalBootPath = getTidalBootPath();
    const ghciPath = path.join(getGhciBasePath(), 'ghci');

    info(`GHCI path: ${ghciPath}`);
    info(`Tidal boot path: ${tidalBootPath}`);

    const raw = fs.readFileSync(tidalBootPath, 'utf-8');

    proc = child_process.spawn(ghciPath, [], { shell: true });

    proc.stderr.on('data', (data) => {
      stdErr.push(data.toString('utf8'));
      setTimeout(() => {
        if (stdErr.length) {
          const out = stdErr.join('');
          stdErr.length = 0;
          error(out);
        }
      }, 50);
    });

    proc.stdout.on('data', (data) => {
      stdOut.push(data.toString('utf8'));
      setTimeout(() => {
        if (stdOut.length) {
          const out = stdOut.join('');
          stdOut.length = 0;
          info(out);
        }
      }, 50);
    });

    proc.stdin.write(raw);
  }

  return proc;
};
