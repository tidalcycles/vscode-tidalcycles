/* eslint-disable */
import { Hover, HoverProvider, Disposable } from 'vscode';
import {
  Position,
  TextDocument,
  CancellationToken,
  MarkdownString,
  Range,
  CompletionItemKind,
} from 'vscode';
import {
  CompletionItemProvider,
  CompletionContext,
  ProviderResult,
  CompletionItem,
  CompletionList,
  Uri,
  window,
} from 'vscode';
import { Config } from './config';
import * as yaml from 'js-yaml';
import * as path from 'path';
import { readFileSync } from 'fs';
import * as vscode from 'vscode';

export enum CodeHelpDetailLevel {
  OFF = 0,
  MINIMUM = 1,
  NO_EXAMPLES_NO_LINKS = 2,
  FULL = 3,
}

enum TidalTypeDescription {
  UNKNOWN,
  ANY,
  RATIONAL_PATTERN,
  CONTROL_PATTERN,
  TIME_PATTERN,
}

class TidalParameterDescription {
  constructor(
    public readonly name: string,
    public readonly help: MarkdownString,
    public readonly editable?: boolean,
    public readonly type?: TidalTypeDescription
  ) {}
}

class TidalCommandDescription {
  public readonly command: string;
  public readonly alias?: string;
  public readonly formattedCommand: MarkdownString[];
  public readonly parameters: TidalParameterDescription[] | undefined;
  public readonly returns: MarkdownString | undefined;
  public readonly help: MarkdownString | undefined;
  public readonly examples: MarkdownString[];
  public readonly links: { url: string; title: MarkdownString }[];

  constructor(config: {
    command: string;
    alias?: string;
    formattedCommand?: string | MarkdownString | (string | MarkdownString)[];
    parameters?: TidalParameterDescription[];
    returns?: string;
    help?: MarkdownString | string;
    links?: { url: string; title: string | MarkdownString }[];
    examples?: string | string[] | MarkdownString | MarkdownString[];
  }) {
    let {
      command,
      alias,
      formattedCommand,
      parameters,
      returns,
      help,
      links,
      examples,
    } = config;

    this.command = command;
    this.alias = alias;

    if (typeof parameters === 'undefined') {
      this.parameters = [];
    } else {
      this.parameters = parameters.map((parm) => ({
        ...parm,
        editable: typeof parm.editable === 'undefined' ? false : parm.editable,
        help:
          typeof parm.help === 'string'
            ? new MarkdownString(parm.help)
            : parm.help,
      }));
    }
    if (typeof formattedCommand === 'undefined') {
      if (typeof parameters === 'undefined') {
        formattedCommand = command + ' ?';
      } else {
        formattedCommand =
          command + ' ' + this.parameters.map((x) => x.name).join(' ');
      }
    }

    if (!Array.isArray(formattedCommand)) {
      formattedCommand = [formattedCommand];
    }

    this.formattedCommand = formattedCommand.map((cmd) => {
      if (typeof cmd === 'string') {
        if (cmd.indexOf('`') < 0 || cmd.indexOf('    ') !== 0) {
          cmd = `    ${cmd}`;
        }
        return new MarkdownString(cmd);
      }
      return cmd;
    });

    this.parameters.forEach((p) => (p.help.isTrusted = true));
    this.formattedCommand.forEach((cmd) => {
      cmd.isTrusted = true;
    });

    let myReturns;
    if (typeof returns === 'undefined') {
      myReturns = undefined;
    } else {
      myReturns =
        typeof returns === 'string' ? new MarkdownString(returns) : returns;
      myReturns.isTrusted = true;
    }
    this.returns = myReturns;

    if (typeof help === 'undefined') {
      this.help = undefined;
    } else {
      this.help = typeof help === 'string' ? new MarkdownString(help) : help;
      this.help.isTrusted = true;
    }

    this.links =
      typeof links === 'undefined'
        ? []
        : links.map((link) => ({
            ...link,
            title:
              typeof link.title === 'string'
                ? new MarkdownString(link.title)
                : link.title,
          }));

    if (typeof examples === 'undefined') {
      this.examples = [];
    } else if (typeof examples === 'string') {
      this.examples = [new MarkdownString(examples)];
    } else if (Array.isArray(examples)) {
      this.examples = (examples as (string | MarkdownString)[]).map((x) => {
        if (typeof x === 'string') {
          x = x.replace(/(\s*\r?\n)*$/, '').replace(/\r?\n/g, '\r\n');
          let cmduri = Uri.parse(
            'command:tidal.eval?' +
              encodeURIComponent(JSON.stringify({ command: x }))
          );
          x = new MarkdownString(`~~~
${x}
~~~
[Run](${cmduri.toString()})
`);
        }
        return x;
      });
    } else {
      this.examples = [examples];
    }
    this.examples.forEach((x) => (x.isTrusted = true));
  }

  public format(
    detailLevel: CodeHelpDetailLevel,
    withCommand: boolean = true
  ): MarkdownString | undefined {
    if (detailLevel === CodeHelpDetailLevel.OFF) {
      return undefined;
    }

    const hline = '\r\n- - -\r\n\r\n';
    let ms = new MarkdownString('');
    ms.isTrusted = true;

    ms = ms.appendMarkdown(
      withCommand
        ? this.formattedCommand.map((x) => x.value).join('    \n')
        : ''
    );
    if (detailLevel === CodeHelpDetailLevel.MINIMUM) {
      return ms;
    }

    ms = ms.appendMarkdown(
      typeof this.help === 'undefined'
        ? ''
        : (ms.value.length > 0 ? hline : '') + this.help.value
    );

    ms = ms
      .appendMarkdown(
        typeof this.parameters === 'undefined' || this.parameters.length === 0
          ? ''
          : hline +
              this.parameters
                .map(
                  (x) =>
                    `\`${x.name}\` ` +
                    (typeof x.type !== 'undefined'
                      ? `\`${TidalTypeDescription[x.type]}\``
                      : '') +
                    ` ${x.help.value}`
                )
                .join('    \r\n')
      )
      .appendMarkdown(
        typeof this.returns === 'undefined'
          ? ''
          : '\r\n\r\n' + 'Returns: ' + this.returns.value
      );

    if (detailLevel === CodeHelpDetailLevel.NO_EXAMPLES_NO_LINKS) {
      return ms;
    }

    ms = ms
      .appendMarkdown(
        this.examples.length === 0
          ? ''
          : hline +
              'Examples:\r\n\r\n' +
              this.examples.map((x) => x.value).join('    \r\n')
      )
      .appendMarkdown(
        this.links.length === 0
          ? ''
          : hline +
              this.links
                .map(
                  (lnk) =>
                    (lnk.title.value.trim() === ''
                      ? ''
                      : `${lnk.title.value}: `) + `<${lnk.url}>`
                )
                .join('    \r\n')
      );
    return ms;
  }
}

export interface YamlInfo {
  source: string;
  ydef: object;
}

export class TidalLanguageHelpProvider
  implements HoverProvider, CompletionItemProvider
{
  public readonly commandDescriptions: {
    [word: string]: TidalCommandDescription;
  } = {};

  constructor(
    private readonly extensionPath: string,
    private readonly config: Config,
    yamlCommandDefinitions?: YamlInfo[]
  ) {
    this.init(yamlCommandDefinitions);
  }

  public init(yamlCommandDefinitions?: YamlInfo[]) {
    const extraFiles = this.config.getExtraCommandsFiles();
    const defaultSources = ['commands-generated.yaml', 'commands.yaml'].map(
      (x) => path.join(this.extensionPath, x)
    );

    const combinedDefinitions = [
      ...(typeof yamlCommandDefinitions === 'undefined' ? defaultSources : []),
      ...(typeof extraFiles === 'undefined' ? [] : extraFiles),
    ]
      .map((defPath) => {
        try {
          return {
            source: defPath,
            ydef: yaml.load(readFileSync(defPath).toString()),
          };
        } catch (error) {
          window.showErrorMessage(
            `Error parsing Tidal command yaml from ${defPath}: ` + error
          );
        }
        return undefined;
      })
      .filter((x) => typeof x !== 'undefined')
      .map((x) => x as unknown as { source: string; ydef: any }) // makes typescript happy, because it can't infer the !undefined tpye from the filter
      .reduce(
        (x, y) => {
          return [...x, y];
        },
        typeof yamlCommandDefinitions === 'undefined'
          ? ([] as YamlInfo[])
          : yamlCommandDefinitions
      );
    const newKeys = combinedDefinitions
      .map(({ source, ydef }) => {
        // parse all yamls
        try {
          return this.parseYamlDefinitions(ydef);
        } catch (error) {
          window.showErrorMessage(
            `Error loading Tidal command descriptions from ${source}: ` + error
          );
        }
        return [];
      })
      .reduce(
        // flatten array of arrays
        (x, y) => {
          x = [...x, ...y];
          return x;
        },
        []
      )
      .map((cmd) => {
        // add new commands and remember which were added/updated
        this.commandDescriptions[cmd.command] = cmd;
        return cmd.command;
      })
      .reduce(
        (x, y) => {
          // convert array of added commands to object for faster indexing (see below)
          x[y] = true;
          return x;
        },
        {} as { [key: string]: boolean }
      );
    Object.keys(this.commandDescriptions)
      .filter((x) => typeof newKeys[x] === 'undefined') // check if the command is still documented
      .forEach((x) => {
        // if not, remove it
        delete this.commandDescriptions[x];
      });
  }

  public createCommands(): Disposable[] {
    return [
      vscode.commands.registerCommand('tidal.codehelp.reload', () => {
        this.init();
      }),
    ];
  }

  private parseYamlDefinitions(ydef: object): TidalCommandDescription[] {
    return Object.entries(ydef).map(([command, v, ..._]) => {
      if (typeof command !== 'string') {
        throw new Error('Invalid command key type ' + typeof command);
      }

      let parameters: TidalParameterDescription[] | undefined = undefined;
      let examples: string[] | undefined = undefined;
      let links: { url: string; title: string }[] | undefined = undefined;
      let formattedCommand: string[] = [];
      let help: string | undefined = undefined;
      let returns: string | undefined = undefined;
      let alias: string | undefined = undefined;

      if (typeof v === 'object') {
        Object.entries(v === null ? {} : v).map(([property, value, ..._]) => {
          if (typeof property !== 'string') {
            throw new Error('Invalid property key type ' + typeof property);
          }
          if (property === 'cmd' || property === 'formattedCommand') {
            if (typeof value === 'string') {
              formattedCommand = [value];
            } else if (Array.isArray(value)) {
              formattedCommand = value.filter((x) => typeof x === 'string');
            }
          } else if (property === 'alias') {
            if (typeof value === 'string') {
              alias = value;
            }
          } else if (property === 'return' || property === 'returns') {
            if (typeof value === 'string') {
              returns = value;
            }
          } else if (property === 'help' || property === 'doc') {
            if (typeof value === 'string') {
              help = value;
            }
          } else if (
            property === 'parm' ||
            property === 'param' ||
            property === 'params' ||
            property === 'parameters'
          ) {
            if (typeof value === 'object' && value !== null) {
              parameters = [];

              Object.entries(value)
                .map(([parmName, parmprops, ..._]) => {
                  if (typeof parmName === 'string') {
                    if (typeof parmprops !== 'string') {
                      parmprops = '' + parmprops;
                    }
                    return new TidalParameterDescription(
                      parmName,
                      new MarkdownString(parmprops)
                    );
                  } else {
                    throw new Error(
                      'Invalid parameter key type ' + typeof parmName
                    );
                  }
                })
                .filter((x) => typeof x !== 'undefined')
                .forEach((x) => {
                  (parameters as TidalParameterDescription[]).push(x);
                });
            }
          } else if (property === 'example' || property === 'examples') {
            if (typeof value === 'string') {
              value = [value];
            }

            if (Array.isArray(value)) {
              examples = value.filter((x) => typeof x === 'string');
            }
          } else if (property === 'link' || property === 'links') {
            if (!Array.isArray(value)) {
              if (typeof value === 'string' || typeof value === 'object') {
                value = [value];
              } else {
                throw Error('Unknown link type ' + typeof value);
              }
            }

            links = (value as any[])
              .map((x) => {
                if (typeof x === 'string') {
                  return { url: x, title: '' };
                }
                if (typeof x === 'object') {
                  return { url: x.url, title: x.title };
                }
                throw new Error('Unknown link type ' + typeof x);
              })
              .filter((x) => typeof x.url !== 'undefined')
              .map((x) => ({
                ...x,
                title: typeof x.title === 'undefined' ? '' : x.title,
              }));
          }
        });
      } else if (typeof v === 'string') {
        command = v;
      } else {
        throw new Error('Invalid command description value type ' + typeof v);
      }

      return new TidalCommandDescription({
        command,
        alias,
        formattedCommand,
        parameters,
        returns,
        help,
        links,
        examples,
      });
    });
  }

  private getWordAtCursor(
    document: TextDocument,
    position: Position
  ): { word: string | undefined; range: Range | undefined } {
    const line = document
      .lineAt(position.line)
      .text.replace(/--.*$/, '')
      .replace(/\s+$/, '');
    if (position.character > line.length) {
      return { word: undefined, range: undefined };
    }
    let startChar = position.character;
    for (let i = startChar - 1; i >= 0; i--) {
      startChar = i;
      const m = line.charAt(i).match(/^[0-9a-z_]$/i);
      if (m === null || m.length === 0) {
        startChar = i + 1;
        break;
      }
    }
    let endChar = position.character;
    for (let i = endChar; i <= line.length; i++) {
      endChar = i;
      if (i < line.length) {
        const m = line.charAt(i).match(/^[0-9a-z_']$/i);
        if (m === null || m.length === 0) {
          break;
        }
      }
    }
    const htext = line.substr(startChar, endChar - startChar);
    return {
      word: htext,
      range: new Range(position.line, startChar, position.line, endChar),
    };
  }

  public provideCompletionItems(
    document: TextDocument,
    position: Position,
    token: CancellationToken,
    context: CompletionContext
  ): ProviderResult<CompletionItem[] | CompletionList> {
    if (
      this.config.getCompletionHelpDetailLevel() === CodeHelpDetailLevel.OFF
    ) {
      return [];
    }
    const { word, range } = this.getWordAtCursor(document, position);
    if (typeof word === 'undefined' || typeof range === 'undefined') {
      return undefined;
    }
    const matches = Object.keys(this.commandDescriptions)
      .filter((k) => k.startsWith(word))
      .map((k) => ({ key: k, cdesc: this.commandDescriptions[k] }))
      .map(({ key, cdesc }) => {
        const item = new CompletionItem(key);
        let insertCommand = cdesc;

        if (typeof cdesc.alias !== 'undefined') {
          const alias = cdesc.alias;
          let adesc = this.commandDescriptions[alias];
          if (typeof adesc !== 'undefined') {
            cdesc = adesc;
          }
        }

        item.kind = CompletionItemKind.Snippet;

        if (typeof cdesc !== 'undefined') {
          item.documentation = cdesc.format(
            this.config.getCompletionHelpDetailLevel(),
            false
          );
        }
        item.range = range;
        item.detail = cdesc.formattedCommand
          .map((x) => x.value.replace(/`/g, ''))
          .join('    \n');

        if (typeof cdesc.parameters === 'undefined') {
          item.detail = 'Tidal code';
        } else {
          item.insertText =
            insertCommand.command +
            (insertCommand.parameters
              ? insertCommand.parameters
              : cdesc.parameters
            )
              .filter((x) => x.editable)
              .map((x) => x.name)
              .join(' ');
        }

        return item;
      });
    return matches;
  }

  public provideHover(
    document: TextDocument,
    position: Position,
    token: CancellationToken
  ): Hover | undefined {
    if (this.config.getHoverHelpDetailLevel() === CodeHelpDetailLevel.OFF) {
      return undefined;
    }

    const { word, range } = this.getWordAtCursor(document, position);
    if (typeof word === 'undefined' || typeof range === 'undefined') {
      return undefined;
    }
    let commandDescription = this.commandDescriptions[word];
    if (typeof commandDescription === 'undefined') {
      return undefined;
    }
    if (typeof commandDescription.alias !== 'undefined') {
      const nhover = this.commandDescriptions[commandDescription.alias];
      if (typeof nhover !== undefined) {
        commandDescription = nhover;
      }
    }

    const hovermd = commandDescription.format(
      this.config.getHoverHelpDetailLevel(),
      true
    );
    if (typeof hovermd === 'undefined') {
      return undefined;
    }
    return new Hover(hovermd, range);
  }
}
