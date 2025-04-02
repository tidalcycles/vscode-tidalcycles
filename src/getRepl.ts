import * as fs from 'fs';
import * as path from 'path';
import * as child_process from 'child_process';
import { write, writeLine } from './output';
import { getTidalBootPath } from './getTidalBootPath';
import { getGhciBasePath } from './getGhciPath';



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

export const send = (command: string) => {
    const proc = getProcess();
    proc.stdin.write(command);
    proc.stdin.write('\n');
};

export const quit = () => {
    const proc = getProcess();
    proc.kill();
}

