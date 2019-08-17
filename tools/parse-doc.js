#!/usr/bin/env node
/*

Instructions:

 * Download wiki text (not HTML source) from the following URLs:
    * https://tidalcycles.org/index.php/All_the_functions
    * https://tidalcycles.org/index.php/List_of_Transitions
    * https://tidalcycles.org/index.php/Control_Functions
 * Save wiki text to file
 * Call this script with the file name on the command line
    * Note that order matters, so it's recommended to have first all functions, then transitionas and then control functions as input
 * Redirect output as desired

*/

const baseUrl = 'https://tidalcycles.org/index.php/';

process.argv.slice(2).forEach(inFile => {
    const fs = require('fs')
    const lines = fs.readFileSync(inFile).toString().split(/(\r?\n)+/);
    const context = {commands:[]};
    
    console.log(`## ${inFile}`);

    let patterns = [
        [RegExp(/^\s*[|]\s*[\[]{2,2}(\w+)[\]]{2,2}\s*$/), m => {
            context.commands.push({name:m[1],help:[]});
            return m[1];
        }]
        , [RegExp(/^\s*[|]\s*<code>\s*(.+?)\s*<\/code>\s*$/i), m => {
            const cmd = context.commands.pop();
            if(typeof cmd !== 'undefined' && cmd !== null){
                cmd['args'] = m[1];
                context.commands.push(cmd);
            }
            return(m[1]);
        }]
        , [RegExp(/^\s*[|]\s*(.+?)\s*$/i), m => {
            const cmd = context.commands.pop();
            if(typeof cmd !== 'undefined' && cmd !== null){
                const val = m[1].trim();
                if(val.length !== 0 && val.match(/\w+/)){
                    cmd.help.push(m[1]);
                }
                context.commands.push(cmd);
            }
            return(m[1]);
        }]
    ];

    for(let i=0;i<lines.length;i++){
        for(let j=0;j<patterns.length;j++){
            const m = lines[i].match(patterns[j][0]);
            if(typeof m !== 'undefined' && m !== null){
                patterns[j][1](m);
                break;
            }
        }
    }

    context.commands.forEach(cmd => {
        let ydef = `${cmd.name}:`;

        if(typeof cmd.args !== 'undefined' && cmd.args !== null){
            ydef = `${ydef}
    cmd: ${cmd.name} ${cmd.args}
    params:`;
            let args = cmd.args;
            let returns = undefined;
            if(args.indexOf("->") < 0){
                args = args.split(/\W+/);
            }
            else {
                args = args.split(/\W*->\W*/);
                returns = args.pop();
            }
            /*
            args.map(x => ([
                x
                , x.replace(/[^0-9a-z'_.\[\]]/gi,'').replace(/'/g,"\\'")
                ]))
                .filter(x => x[1].length > 0)
                .forEach(([plain, disp]) => {
                ydef = `${ydef}
        - '${disp}': ~`;
                });
                */
        }
        else {
            ydef = `${ydef}
    cmd: ${cmd.name}`;
        }

        if(cmd.help.length > 0){
            ydef = `${ydef}
    help: |`;
            cmd.help.forEach(x => {
                x = x.replace(/#/g,"\\#")
                x = x.replace(/<code>\s*(.*?)\s*<\/code>/ig,"`$1`")
                x = x.replace(/\[{2,2}(.*?)\]{2,2}/ig,"`$1`")
                ydef = `${ydef}
        ${x}`;
            });
        }

        // usually, if there is not even a help one-liner, there's no page either, so no use in linking to it
        if(typeof cmd.help !== 'undefined' && cmd.help.length > 0){
            ydef = `${ydef}
    links:
        - ${baseUrl}${cmd.name}`;
        }

        console.log(ydef);
    })
});
