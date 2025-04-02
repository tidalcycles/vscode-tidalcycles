import * as fs from 'fs';
import * as child_process from 'child_process';
import { write } from './output';
// import { readBootTidal } from './resourceReader';
// import { bootSuperDirt } from './superdirt/superdirt';

const bootPath =
        '/Users/kindohm/.cabal/share/x86_64-osx-ghc-9.4.8/tidal-1.9.5/BootTidal.hs';

type Repl = {
    send: (x: string) => void;
};

let proc: child_process.ChildProcessWithoutNullStreams;

const getProcess = () : child_process.ChildProcessWithoutNullStreams => {
    if (!proc) {
        console.log('process not ready yet')
        const path = '/Users/kindohm/.ghcup/bin/ghci';
        const raw = fs.readFileSync(bootPath, 'utf-8');

        proc = child_process.spawn(path, [], { shell: true });

        proc.stderr.on('data', (data) => {
            console.error('errorrrr!!!');
            console.error(data.toString('utf8'));
            write(data.toString('utf8'));
            // this.stdErr.push(data.toString('utf8'))
            // setTimeout(() => {
            //   if (this.stdErr.length) {
            //     let err = this.stdErr.join('')
            //     this.stdErr.length = 0;
            //     this.emit('stderr', err);
            //   }
            // }, 50)
        });
    
        proc.stdout.on('data', (data) => {
            console.log(data.toString('utf8'));
            write(data.toString('utf8'));
            // this.stdOut.push(data.toString('utf8'))
            // setTimeout(() => {
            //   if (this.stdOut.length) {
            //     let out = this.stdOut.join('')
            //     this.stdOut.length = 0
            //     this.emit('stdout', out);
            //   }
            // }, 50)
        });


        proc.stdin.write(raw);
    }
    console.log('process is ready')

    return proc;
};

export const send = (command: string) => {
    const process = getProcess();

    console.log('sending', command);
    process.stdin.write(command);
    console.log('sent.');

};

// let terminal: Terminal;

// interface IRepl {
//   send(input: string): void;
// }

// let instance: IRepl;

// export const getRepl = async (): Promise<IRepl> => {
//   return new Promise(async (resolve, reject) => {

//     if (!terminal || !instance) {
//       terminal = window.createTerminal({
//         name: 'TidalCycles',
//       });

//       const rawBootTidal = fs.readFileSync('/Users/kindohm/.cabal/share/x86_64-osx-ghc-9.4.8/tidal-1.9.5/BootTidal.hs', 'utf-8');
//       const bootCommands = rawBootTidal.split('\n');

//       terminal.show();
//       await writeLineWait('ghci -XOverloadedStrings', 3000);

//       setTimeout(async () => {
//         for (let i = 0; i < bootCommands.length; i++) {
//           // await writeLine(bootCommands[i]);
//         }

//         await writeLineWait(rawBootTidal);

//         window.activeTextEditor?.show();

//         instance = {
//           send,
//         };

//         resolve(instance);
//         // cb(instance);
//       }, 2000);
//     } else {
//       resolve(instance);
//       // cb(instance);
//     }
//   });
// }

// const writeLineWait = async (
//   line: string,
//   time: number = 100
// ): Promise<void> => {
//   return new Promise((resolve, reject) => {
//     setTimeout(() => {
//       terminal.sendText(`${line}`);
//       resolve();
//     }, time);
//   });
// };

// const writeLine = (line: string) => {
//   terminal.sendText(`${line}`);
// };

// const send = (block: string) => {
//   writeLine(':{');
//   writeLine(block);
//   writeLine(':}');
// };
