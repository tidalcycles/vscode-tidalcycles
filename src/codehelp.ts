import { Hover, HoverProvider, Position, TextDocument, CancellationToken, MarkdownString, Range } from 'vscode';
import { CompletionItemProvider, CompletionContext, ProviderResult, CompletionItem, CompletionList, Uri, window } from 'vscode';

enum TidalTypeDescription {
    UNKNOWN
    , ANY
    , RATIONAL_PATTERN
    , CONTROL_PATTERN
    , TIME_PATTERN
}

class TidalParameterDescription {
    constructor(
        public readonly name:string
        , public readonly help:MarkdownString
        , public readonly editable?:boolean
        , public readonly type?:TidalTypeDescription
    ){}
}

class TidalCommandDescription {
    public readonly formattedCommand:MarkdownString;
    public readonly parameters:TidalParameterDescription[] | undefined;
    public readonly returns:{help:MarkdownString,type:TidalTypeDescription | undefined} | undefined;
    public readonly help:MarkdownString |  undefined;
    public readonly examples:MarkdownString[];
    public readonly links:({url:string, title:MarkdownString})[];

    constructor(
        public readonly command:string
        , formattedCommand?:string | MarkdownString
        , parameters?:TidalParameterDescription[]
        , returns?:{help:MarkdownString | string, type:TidalTypeDescription | undefined}
        , help?:MarkdownString | string
        , links:({url:string, title:string | MarkdownString})[] = []
        , examples:string | string[] | MarkdownString | MarkdownString[] = []
    ){
        if(typeof parameters === 'undefined'){
            this.parameters = [];
        }
        else {
            this.parameters = parameters.map(parm => ({
                    ...parm
                    , editable: typeof parm.editable === 'undefined' ? false : parm.editable
                    , help:(typeof parm.help === 'string' ? new MarkdownString(parm.help) : parm.help)
                })
            );
        }
        if(typeof formattedCommand === 'undefined'){
            if(typeof parameters === 'undefined'){
                formattedCommand = command+" ?";
            }
            else {
                formattedCommand = command+" "+this.parameters.map(x => x.name).reduce((x,y) => x+" "+y);
            }
        }
        
        if(typeof formattedCommand === 'string'){
            if(formattedCommand.indexOf("`") < 0 || formattedCommand.indexOf("    ") !== 0){
                formattedCommand = `    ${formattedCommand}`;
            }
            formattedCommand = new MarkdownString(formattedCommand);
        }
        
        this.formattedCommand = formattedCommand;

        this.parameters.forEach(p => p.help.isTrusted = true);
        this.formattedCommand.isTrusted = true;

        if(typeof returns === 'undefined'){
            this.returns = undefined;
        }
        else {
            this.returns = {...returns, help:typeof returns.help === 'string' ?
                new MarkdownString(returns.help)
                : returns.help};
            this.returns.help.isTrusted = true;
        }
        
        if(typeof help === 'undefined'){
            this.help = undefined;
        }
        else {
            this.help = typeof help === 'string' ? new MarkdownString(help) : help;
            this.help.isTrusted = true;
        }

        this.links = links.map(link => ({
            ...link
            , title: typeof link.title === 'string' ?  new MarkdownString(link.title) : link.title}
        ));
        
        if(typeof examples === 'string'){
            this.examples = [new MarkdownString(examples)];
        }
        else if(Array.isArray(examples)){
            this.examples = (examples as (string | MarkdownString)[]).map(x => {
                if(typeof x === 'string'){
                    x = new MarkdownString(
                        "`"+x+"` "
                        + "[Run]("+Uri.parse("command:tidal.eval?"+encodeURIComponent(JSON.stringify({"command":x})))+")"
                    );
                }
                return x;
            });
        }
        else {
            this.examples = [examples];
        }
        this.examples.forEach(x => x.isTrusted = true);
    }

    public format(withCommand:boolean=true): MarkdownString {
        const hline = "\r\n- - -\r\n\r\n";
        const ms = new MarkdownString();
        ms.isTrusted = true;

        return ms
            .appendMarkdown(withCommand ? this.formattedCommand.value : "")
            .appendMarkdown(typeof this.help === 'undefined' ? "" : hline + this.help.value)
            .appendMarkdown(typeof this.parameters === 'undefined' || this.parameters.length === 0 ? "" :
                hline + this.parameters
                    .map(x => 
                    `\`${x.name}\` `
                    + (typeof x.type !== 'undefined' ? `\`${TidalTypeDescription[x.type]}\`` : "")
                    + ` ${x.help.value}`)
                    .reduce((x,y) => x+"    \r\n"+y,"")
            )
            .appendMarkdown(typeof this.returns === 'undefined' ? "" :
                "\r\n\r\n" + "Returns: "
                + (typeof this.returns.type === 'undefined' ? "" : `\`${TidalTypeDescription[this.returns.type]}\``)
                + this.returns.help
            )
            .appendMarkdown(this.examples.length === 0 ? "" :
                hline + "Examples:\r\n\r\n"
                + this.examples.map(x => x.value).reduce((x,y) => x+"    \r\n"+y,"")
            )
            .appendMarkdown(this.links.length === 0 ? "" :
                hline + this.links
                    .map(lnk => 
                        (lnk.title.value.trim() === "" ? "" : `${lnk.title.value}: `)
                        + `<${lnk.url}>`
                    )
                    .reduce((x,y) => x+"    \r\n"+y,"")
            )
            ;
    }

}

export class TidalLanguageHelpProvider implements HoverProvider, CompletionItemProvider {
    public readonly commandDescriptions: ({[word:string]:TidalCommandDescription}) = {};

    constructor(
        yamlCommandDefinitions:({source: string, ydef:object})[]
    ){
        yamlCommandDefinitions.forEach(({source, ydef}) => {
            try {
                this.parseYamlDefinitions(ydef)
                    .forEach(cmd => this.commandDescriptions[cmd.command] = cmd);
            }
            catch(error){
                window.showErrorMessage(`Error loading Tidal command descriptions from ${source}: `+error);
            }
        });
    }

    private parseYamlDefinitions(ydef:object): TidalCommandDescription[] {
        return Object.entries(ydef).map(([command, v, ..._]) => {
            if(typeof command !== 'string'){
                throw new Error("Invalid command key type "+(typeof command));
            }

            let parameters:TidalParameterDescription[] | undefined = undefined;
            let examples:string[] | undefined = undefined;
            let links:({url:string, title:string})[] | undefined = undefined;
            let formattedCommand:string | undefined = undefined;
            let help:string | undefined = undefined;
            let returns:{help:MarkdownString | string, type:TidalTypeDescription | undefined} | undefined = undefined;

            if(typeof v === 'object'){
                Object.entries(v === null ? {} : v).map(([property, value, ..._]) => {
                    if(typeof property !== 'string'){
                        throw new Error("Invalid property key type "+(typeof property));
                    }
                    if(property === 'cmd' || property === 'formattedCommand'){
                        if(typeof value === 'string'){
                            formattedCommand = value;
                        }
                    }
                    else if(property === 'help' || property === 'doc'){
                        if(typeof value === 'string'){
                            help = value;
                        }
                    }
                    else if(property === 'parm' || property === 'param' || property === 'params' || property === 'parameters'){
                        if(typeof value === 'object' && value !== null){
                            parameters = [];

                            Object.entries(value).map(([parmName, parmprops, ..._]) => {
                                if(typeof parmName === 'string'){
                                    if(typeof parmprops !== 'string'){
                                        parmprops = ""+parmprops;
                                    }
                                    return new TidalParameterDescription(parmName, new MarkdownString(parmprops));
                                }
                                else {
                                    throw new Error("Invalid parameter key type "+(typeof parmName));
                                }
                            })
                            .filter(x => typeof x !== 'undefined')
                            .forEach(x => {
                                (parameters as TidalParameterDescription[]).push(x);
                            });
                        }
                    }
                    else if(property === 'example' || property === 'examples'){
                        if(typeof value === 'string'){
                            value = [value];
                        }
                        
                        if(Array.isArray(value)) {
                            examples = value.filter(x => typeof x === 'string');
                        }
                    }
                    else if(property === 'link' || property === 'links'){
                        if(!Array.isArray(value)){
                            if(typeof value === 'string' ||  typeof value === 'object'){
                                value = [value];
                            }
                            else {
                                throw Error("Unknown link type "+(typeof value));
                            }
                        }
                        
                        links = (value as any[]).map(x => {
                            if(typeof x === 'string'){
                                return {url:x, title:""};
                            }
                            if(typeof x === 'object'){
                                return {url:x.url, title: x.title};
                            }
                            throw new Error("Unknown link type "+(typeof x));
                        })
                        .filter(x => typeof x.url !== 'undefined')
                        .map(x => ({...x, title: typeof x.title === 'undefined' ? "" : x.title}));
                        
                    }
                });
            }
            else if(typeof v === 'string'){
                command = v;
            }
            else {
                throw new Error("Invalid command description value type "+(typeof v));
            }

            return new TidalCommandDescription(command, formattedCommand, parameters, returns, help, links, examples);
        });
    }

    private getWordAtCursor(document:TextDocument, position:Position): ({word:string |  undefined, range:Range | undefined}){
        const line = document.lineAt(position.line).text.replace(/--.*$/,'').replace(/\s+$/,'');
        if(position.character > line.length){
            return {word:undefined, range:undefined};
        }
        let startChar = position.character;
        for(let i=startChar-1;i>=0;i--){
            startChar = i;
            const m = line.charAt(i).match(/^[0-9a-z_]$/i);
            if(m === null || m.length === 0){
                startChar = i+1;
                break;
            }
        }
        let endChar = position.character;
        for(let i=endChar;i<=line.length;i++){
            endChar = i;
            if(i < line.length){
                const m = line.charAt(i).match(/^[0-9a-z_]$/i);
                if(m === null || m.length === 0){
                    break;
                }
            }
        }
        const htext = line.substr(startChar, endChar-startChar);
        return {word:htext, range:new Range(position.line, startChar, position.line, endChar)};
    }

    public provideCompletionItems(
        document: TextDocument
        , position: Position
        , token: CancellationToken
        , context: CompletionContext
    ): ProviderResult<CompletionItem[] | CompletionList> {
        const {word, range} = this.getWordAtCursor(document, position);
        if(typeof word === 'undefined' || typeof range === 'undefined'){
            return undefined;
        }
        const matches = Object.keys(this.commandDescriptions)
            .filter(k => k.startsWith(word))
            .map(k => ({'key':k, 'cdesc':this.commandDescriptions[k]}))
            .map(({key, cdesc}) => {
                const item = new CompletionItem(key);

                if(typeof cdesc !== 'undefined'){
                    item.documentation = cdesc.format(false);
                }
                item.range = range;
                item.detail = cdesc.formattedCommand.value.replace(/`/g,'');

                if(typeof cdesc.parameters === 'undefined'){
                    item.detail = "Tidal code";
                }
                else {
                    item.insertText = cdesc.command
                        + cdesc.parameters.filter(x => x.editable)
                                            .map(x => x.name)
                                            .reduce((x,y)=>x+" "+y,"");
                }

                return item;
            })
        ;
        return matches;
    }

    public provideHover(document:TextDocument, position:Position, token:CancellationToken): Hover | undefined {
        const {word, range} = this.getWordAtCursor(document, position);
        if(typeof word === 'undefined' || typeof range === 'undefined'){
            return undefined;
        }
        let hoverText = this.commandDescriptions[word];
        if(typeof hoverText === 'undefined'){
            return undefined;
        }

        return new Hover(hoverText.format(true), range);
    }

}

