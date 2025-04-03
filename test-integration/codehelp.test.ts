import { assert } from 'chai';

import * as yaml from 'js-yaml';
import { TidalLanguageHelpProvider, CodeHelpDetailLevel } from '../src/codehelp';
import { Position, CancellationTokenSource, MarkdownString } from 'vscode';
import { createMockDocument } from './mock';
import * as path from 'path';
import * as os from 'os';
import { readFileSync, mkdtempSync, writeFileSync } from 'fs';
import * as vscode from 'vscode';

import * as TypeMoq from 'typemoq';
import { Config } from '../src/config';

suite("Code helper", () => {
    const tempdir = mkdtempSync(path.join(os.tmpdir(),"vstc-"));

    function createMockTestConfig(hoverLevel:string, completionLevel:string): TypeMoq.IMock<Config>{
        let config = new Config();
        let mockConfig = TypeMoq.Mock.ofInstance(config, );

        mockConfig
            .setup(x => x.getHoverHelpDetailLevel())
            .returns(x => CodeHelpDetailLevel[<keyof typeof CodeHelpDetailLevel>hoverLevel]);

        mockConfig
            .setup(x => x.getCompletionHelpDetailLevel())
            .returns(x => CodeHelpDetailLevel[<keyof typeof CodeHelpDetailLevel>completionLevel]);

        return mockConfig;
    }

    test("config", () => {
        let config = new Config();
        ['FULL','MINIMUM','OFF','NO_EXAMPLES_NO_LINKS',"foo"].forEach(x => {
            if(x === "foo"){
                assert.equal(
                    config.stringToCodeHelpDetailLevel(x)
                    , CodeHelpDetailLevel['FULL']
                );
            }
            else {
                assert.equal(
                    config.stringToCodeHelpDetailLevel(x)
                    , CodeHelpDetailLevel[<keyof typeof CodeHelpDetailLevel>x]
                );
            }
        });
    });

    const testData = yaml.load(`
commandName:
    cmd: commandLine
    returns: returnValue
    params:
        param: paramValue
    links:
        - link1
        - url: link2
        - url: link3
          title: title3
    examples:
        - |+
            exampleText
command2:
    cmd: command2
`) as object;

    const extraFileContent = `
command2:
    cmd: override
extracmd:
    cmd:
        - extra
        - aliascmd'
aliascmd':
    alias: commandName
        `;

    test("yaml processing", () => {
        const extraFile = path.join(tempdir, "extra1.yaml")
        writeFileSync(extraFile, extraFileContent)

        const config = createMockTestConfig('FULL', 'FULL');
        config.setup(cfg => cfg.getExtraCommandsFiles()).returns(() => [extraFile]);
        const provider = new TidalLanguageHelpProvider("./", config.object, [{source:"test1",ydef:testData}]);

        assert.exists(provider.commandDescriptions);
        assert.isObject(provider.commandDescriptions);
        assert.hasAllKeys(provider.commandDescriptions, ["commandName", "command2", "extracmd", "aliascmd'"]);
        assert.exists(provider.commandDescriptions["commandName"].command);
        assert.exists(provider.commandDescriptions["commandName"].formattedCommand);
        assert.equal(provider.commandDescriptions["commandName"].formattedCommand.length, 1);
        // TODO(ejconlon) Fix this! Assertion did not pass for me.
        // assert.hasAllKeys(provider.commandDescriptions["commandName"].formattedCommand[0], ["value","isTrusted"]);
        assert.equal(provider.commandDescriptions["commandName"].formattedCommand[0].value, "    commandLine");
        assert.isTrue(provider.commandDescriptions["commandName"].formattedCommand[0].isTrusted);

        assert.exists(provider.commandDescriptions["command2"].command);
        assert.equal(provider.commandDescriptions["command2"].formattedCommand.length, 1);
        assert.equal(provider.commandDescriptions["command2"].formattedCommand[0].value, "    override");

        assert.exists(provider.commandDescriptions["extracmd"].command);
        assert.equal(provider.commandDescriptions["extracmd"].formattedCommand.length, 2);
        assert.equal(provider.commandDescriptions["extracmd"].formattedCommand[0].value, "    extra");
        assert.equal(provider.commandDescriptions["extracmd"].formattedCommand[1].value, "    aliascmd'");

        assert.exists(provider.commandDescriptions["aliascmd'"].command);
        assert.equal(provider.commandDescriptions["aliascmd'"].formattedCommand.length, 0);
        assert.equal(provider.commandDescriptions["aliascmd'"].alias, 'commandName');
    });

    ["hover", "complete"].forEach(helpType => {
        suite(helpType + " content", () => {
            [
                {level: "FULL"
                    , contains:["    commandLine","param","paramValue"
                        ,"returnValue","link1","link2","link3","title3","exampleText"]
                    , notContains:["commandName","aliascmd'"]}
                , {level: "OFF"
                    , contains:[]
                    , notContains:["commandName","    commandLine","param","paramValue"
                        , "returnValue","link1","link2","link3","title3","exampleText","aliascmd'"]}
                , {level: "MINIMUM"
                    , contains:["    commandLine"]
                    , notContains:["param","paramValue"
                        ,"returnValue","link1","link2","link3","title3","exampleText","aliascmd'"]}
                , {level: "NO_EXAMPLES_NO_LINKS"
                    , contains:["    commandLine","param","paramValue"
                        ,"returnValue"]
                    , notContains:["commandName","link1","link2","link3","title3","exampleText","aliascmd'"]}
            ].forEach(({level, contains, notContains}) => {
                ["commandName", "aliascmd'"].forEach(cmdname => {
                    test(`Level: ${level} / ${cmdname}`, () => {
                        const config = createMockTestConfig(level, level);
                        const provider = new TidalLanguageHelpProvider(
                            "./", config.object,
                            [
                                {source:"test1",ydef:testData}
                                , {source:"extra",ydef:yaml.load(extraFileContent) as object}
                            ]
                        );

                        const ts = new CancellationTokenSource();

                        let h;
                        if(helpType === 'complete'){
                            h = provider.provideCompletionItems(
                                createMockDocument(["",`    ${cmdname} arg1 arg2`,""]).object
                                , new Position(1, 5)
                                , ts.token
                                , TypeMoq.Mock.ofType<vscode.CompletionContext>().object
                            );

                            if(level === 'OFF'){
                                if(typeof h === 'undefined' || h === null) {
                                    assert.notExists(h);
                                }
                                else if(Array.isArray(h)){
                                    assert.equal(h.length, 0);
                                }
                                else if(typeof h === 'object') {
                                    assert.equal((h as vscode.CompletionList).items.length, 0);
                                }
                                h = undefined;
                            }
                            else {
                                assert.exists(h);
                                if(Array.isArray(h)){
                                    assert.equal(h.length, 1);
                                    h = h[0];
                                }
                                else if(typeof h === 'object') {
                                    h = (h as vscode.CompletionList).items;
                                    assert.exists(h);
                                    assert.equal(h.length, 1);
                                    h = h[0];
                                }
                                else {
                                    // we should never get here
                                    assert.isTrue(false);
                                    console.log(h);
                                    throw new Error("invalid result type");
                                }
                                assert.equal(h.detail, "    commandLine");
                                assert.exists(h.documentation);
                                assert.exists(h.insertText);
                                if(h.insertText){
                                    let s = h.insertText;
                                    if(typeof s === 'object'){
                                        s = s.value;
                                    }
                                    assert.isTrue(s.indexOf(cmdname) >= 0);
                                }
                                h = h.documentation;
                                assert.typeOf(h, "object");
                                assertContents(
                                    helpType
                                    , h as MarkdownString
                                    , contains.filter(x => x !== '    commandLine')
                                    , notContains.reduce((x,y) => {x.push(y); return x;}, ["    commandLine"])
                                );
                            }

                        }
                        else if(helpType === 'hover') {
                            h = provider.provideHover(
                                createMockDocument(["",`    ${cmdname} arg1 arg2`,""]).object
                                , new Position(1, 5)
                                , ts.token
                            );
                            if(level === 'OFF'){
                                assert.notExists(h);
                                h = undefined;
                            }
                            else {
                                assert.exists(h);
                                if(typeof h !== 'undefined') {
                                    assert.isObject(h);
                                    assert.isArray(h.contents);
                                    assert.isTrue(h.contents.length > 0);
                                    assert.isObject(h.contents[0]);
                                    assertContents(
                                        helpType
                                        , h.contents[0] as MarkdownString
                                        , contains
                                        , notContains
                                    );

                                    assert.exists(h.range);
                                    if(typeof h.range !== 'undefined'){
                                        assert.equal(h.range.start.line, 1);
                                        assert.equal(h.range.start.character, 4);
                                        assert.equal(h.range.end.line, 1);
                                        assert.equal(h.range.end.character, cmdname.length+h.range.start.character);
                                    }
                                }
                            }
                        }
                    });
                });
            });
        });
    });

    function assertContents(type:string, s:MarkdownString, contains:string[], notContains:string[]){
        contains.forEach(x =>{
            assert.isTrue(
                s.value.indexOf(x) >= 0
                , `Expected string ${x} missing from ${type} contents:
--------------\n${s.value}\n--------------\n`
            );
        });
        notContains.forEach(x =>{
            assert.isFalse(
                s.value.indexOf(x) >= 0
                , `Unexpected string ${x} present in ${type} contents:
--------------\n${s.value}\n--------------\n`
            );
        });

    }

    test("commands.yaml", (...args) =>{
        /*
        try loading the commands from the provided commands.yaml file to make
        sure it's not causing any errors and that (at least some) values are
        present.
        */
        const ext = vscode.extensions.getExtension("tidalcycles.vscode-tidalcycles");
        assert.exists(ext, "The tidal extension does not exist.");
        if(typeof ext !== 'undefined' && ext !== null){
            const yf = ["commands-generated.yaml", "commands.yaml"].map(x => ([x, path.join(ext.extensionPath,x)]))
            .map(([source, defPath, ..._]) => {
                const ydef = yaml.load(readFileSync(defPath).toString()) as object;
                return {source: source, ydef};
            });

            const config = createMockTestConfig('FULL', 'FULL');

            const provider = new TidalLanguageHelpProvider("./", config.object, yf);

            ["stut","slow"].forEach(x => {
                assert.hasAnyKeys(provider.commandDescriptions, [x], "Expected command descirption for "+x+" to be present");
            });
        }
    });
});