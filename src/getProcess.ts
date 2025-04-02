import * as path from 'path';
import * as fs from 'fs';
import * as child_process from 'child_process';
import { getTidalBootPath } from './getTidalBootPath';
import { getGhciBasePath } from './getGhciBasePath';
import { write, writeLine } from './logger';

let proc: child_process.ChildProcessWithoutNullStreams;

export const getProcess = () : child_process.ChildProcessWithoutNullStreams => {
    if (!proc) {
        
        const tidalBootPath = getTidalBootPath();
        const ghciPath = path.join(getGhciBasePath(), 'ghci');

        writeLine(`GHCI path: ${ghciPath}`);
        writeLine(`Tidal boot path: ${tidalBootPath}`);

        const raw = fs.readFileSync(tidalBootPath, 'utf-8');

        proc = child_process.spawn(ghciPath, [], { shell: true });

        proc.stderr.on('data', (data) => {
            write(data.toString('utf8'));
        });
    
        proc.stdout.on('data', (data) => {
            write(data.toString('utf8'));
        });


        proc.stdin.write(raw);
    }

    return proc;
};