import * as path from 'path';
import * as fs from 'fs';
import * as child_process from 'child_process';
import { getTidalBootPath } from './getTidalBootPath';
import { getGhciBasePath } from './getGhciBasePath';
import { info, error } from './logger';
import { getPrompt } from './getPrompt';
import { onlyLogErrors } from './config';

let proc: child_process.ChildProcessWithoutNullStreams;

const stdOut: string[] = [];
const stdErr: string[] = [];

let booted = false;
const bootSuccessText = 'SuperDirt';

const shouldLogInfo = () => {
  return !booted || !onlyLogErrors();
};

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
          error(`${getPrompt()} ${cleanStdErr(out)}`);
        }
      }, 50);
    });

    proc.stdout.on('data', (data) => {
      stdOut.push(data.toString('utf8'));
      setTimeout(() => {
        if (stdOut.length) {
          const out = stdOut.join('');

          stdOut.length = 0;

          shouldLogInfo() && info(`${getPrompt()} ${cleanStdOut(out)}`);
          if (!booted && out.indexOf(bootSuccessText) >= 0) {
            booted = true;
          }
        }
      }, 50);
    });

    proc.stdin.write(raw);
  }

  return proc;
};

const cleanStdOut = (stdout: string) => {
  return stdout
    .trim()
    .replace(/tidal>.*Prelude>/g, '')
    .replace(/tidal>/g, '')
    .replace(/Prelude>/g, '')
    .replace(/Prelude.*\|/g, '')
    .replace(/GHCi.*help/g, '');
};

const cleanStdErr = (stderr: string) => {
  return stderr
    .replace(/<interactive>.*error:/g, '')
    .replace(/ \(bound at.*/g, '');
};
