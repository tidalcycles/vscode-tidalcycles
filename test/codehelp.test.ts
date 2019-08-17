import { assert } from 'chai';

import * as yaml from 'js-yaml';
import { TidalLanguageHelpProvider } from '../src/codehelp';
import { Position, CancellationTokenSource, MarkdownString } from 'vscode';
import { createMockDocument } from './mock';
import * as path from 'path';
import { readFileSync } from 'fs';
import * as vscode from 'vscode';

suite("Code helper", () => {
    test("yaml", () => {
        const testData = yaml.load(`
foo:
    cmd: bar
    links:
        - link1
        - url: link2
        - url: link3
          title: title3
`);

        const provider = new TidalLanguageHelpProvider([{source:"test1",ydef:testData}]);

        assert.exists(provider.commandDescriptions);
        assert.isObject(provider.commandDescriptions);
        assert.hasAllKeys(provider.commandDescriptions, ["foo"]);
        assert.exists(provider.commandDescriptions["foo"].command);
        assert.exists(provider.commandDescriptions["foo"].formattedCommand);
        assert.hasAllKeys(provider.commandDescriptions["foo"].formattedCommand, ["value","isTrusted"]);
        assert.equal(provider.commandDescriptions["foo"].formattedCommand.value, "bar");
        assert.isTrue(provider.commandDescriptions["foo"].formattedCommand.isTrusted);

    });

    test("hover", () => {
        const testData = yaml.load(`
foo:
    cmd: bar
    links:
        - link1
        - url: link2
        - url: link3
          title: title3
`);

        const provider = new TidalLanguageHelpProvider([{source:"test1",ydef:testData}]);

        const ts = new CancellationTokenSource();

        let h = provider.provideHover(createMockDocument(["","bar foo baz",""]).object, new Position(1, 5), ts.token);

        assert.exists(h);
        if(typeof h !== 'undefined'){
            assert.exists(h.contents);
            assert.isTrue(h.contents.length > 0);
            let md = h.contents[0] as MarkdownString;
            ["bar","link1","link2","link3","title3"].forEach(x =>{
                assert.isTrue(
                    md.value.indexOf(x) >= 0
                    , `String ${x} missing from hover contents:\n--------------\n${md.value}\n--------------\n`
                );
            });
            assert.exists(h.range);
            if(typeof h.range !== 'undefined'){
                assert.equal(h.range.start.line, 1);
                assert.equal(h.range.start.character, 4);
                assert.equal(h.range.end.line, 1);
                assert.equal(h.range.end.character, 7);
            }
        }

    });

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
                const ydef = yaml.load(readFileSync(defPath).toString());
                return {source: source, ydef};
            });

            const provider = new TidalLanguageHelpProvider(yf);

            ["stut","slow"].forEach(x => {
                assert.hasAnyKeys(provider.commandDescriptions, [x], "Expected command descirption for "+x+" to be present");
            });
        }
    });
});