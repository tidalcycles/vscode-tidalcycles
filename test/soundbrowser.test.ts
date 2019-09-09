import { assert } from 'chai';
import * as TypeMoq from 'typemoq';

import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';

import * as sb from '../src/soundbrowser';
import { Config } from '../src/config';
import * as vscode from 'vscode';

suite("Sound browser", () => {
    const tempdir = fs.mkdtempSync(path.join(os.tmpdir(), "vstc-testsb-"));
    const soundsPath = path.join(tempdir, "sounds");

    const soundsLayout: ({[name:string]:string[]}) = {
        "A": ["A2.wav", "dummy", "a1.wav", "B2.wav", "readme.txt"]
        , "b": ["A2.wav", "a1.wav", "dummy", "B2.wav", "dummy", "readme.txt"]
        , "c": ["dummy", "01_A22.wav", "02 a11.wav", "03 B2.wav", "dummy", "readme.txt"]
    };

    const setup = () => {
        if(!fs.existsSync(soundsPath)){
            fs.mkdirSync(path.join(soundsPath));
        }
        
        Object.keys(soundsLayout)
            .map(k => ({k, v:soundsLayout[k]}))
            .forEach(({k, v}) => {
                const dirPath = path.join(soundsPath, k);
                if(!fs.existsSync(dirPath)){
                    fs.mkdirSync(dirPath);
                }

                v.forEach(f => {
                    const filePath = path.join(dirPath, f);
                    if(!fs.existsSync(filePath)){
                        fs.writeFileSync(filePath, `file: ${f}`, {flag:"w"});
                    }
                });
            });
    };

    setup();

    test("Item sorting", () => {
        const items = ["a1","B1","A2"];

        [
            { ostypes: ["Linux", "Darwin"], result: ["A2", "B1", "a1"]}
            , { ostypes: ["Windows_NT"], result: ["a1", "A2", "B1"]}
        ].forEach(({ostypes, result}) => {
            ostypes.forEach(ostype => {
                assert.sameOrderedMembers(
                    sb.sortItemNamesBySuperDirtConventions(items, ostype).map(x => items[x])
                    , result
                    , `Sort order for ${ostype} is wrong`
                );
            });
        });

    });

    test("FileSystemSoundTreeProvider", async () => {
        let provider = new sb.FileSystemSoundTreeProvider();

        const filterFun = (x:string) => x !== 'dummy';
        let root = new sb.SoundItem({type: 'virt', fullPath: soundsPath, virtualRoot: "sndroot", position: 0});
        
        let result = await provider.getEntries(root, filterFun);

        assert.sameMembers(result.map(x => x.itemName), Object.keys(soundsLayout));

        result.forEach(async (r) => {
            let items = await provider.getEntries(r, filterFun);
            
            const filtLayout = soundsLayout[r.itemName].filter(filterFun);
            const sortFiltLayout = sb.sortItemNamesBySuperDirtConventions(filtLayout).map(x => filtLayout[x]);

            assert.lengthOf(items, filtLayout.length);

            assert.sameOrderedMembers(
                items.map(x => x.fullPath)
                , sortFiltLayout.map(x => path.join(soundsPath, r.itemName, x))
            );

            assert.lengthOf(items.filter(x => x.prettyName.indexOf(".") >= 0), 0, "File extensions should be removed");
            assert.lengthOf(items.filter(
                x =>    x.prettyName.length <= 3
                        || ['_',' '].filter(c => x.prettyName.indexOf(c) < 0).length === 0
                )
                , 0
                , "Pretty names should be at least 3 chars and only then have the prefix removed"
            );

           assert.sameOrderedMembers(
               items.map(x => x.dirtName), sortFiltLayout.map((_, i) => r+":"+i)
               , "dirt name not constructed properly"
            );
        });
    });

    suite("SoundBrowserSoundsView", async () => {
        let config = TypeMoq.Mock.ofType<Config>();

        config.setup(x => x.getPlaySoundOnSelection()).returns(() => true);

        const mockvscode = TypeMoq.Mock.ofType<typeof vscode>();
        
        const commandsMock = TypeMoq.Mock.ofType<typeof vscode.commands>();

        const registeredCommands: ({[key: string]: any}) = {};

        const registerCommandMock = (cmd:string, fun: (() => void)) => {
            const mockDisposable = TypeMoq.Mock.ofType<vscode.Disposable>();
            registeredCommands[cmd] = fun;
            return mockDisposable.object;
        };

        commandsMock.setup(x => x.registerCommand(TypeMoq.It.isAnyString(), TypeMoq.It.isAny()))
            .returns(registerCommandMock);

        mockvscode.setup(x => x.commands).returns(() => {
            return commandsMock.object;
        });

        const windowMock = TypeMoq.Mock.ofType<typeof vscode.window>();

        const editorMock = TypeMoq.Mock.ofType<vscode.TextEditor>();

        windowMock.setup(x => x.activeTextEditor).returns(() => {
            return editorMock.object;
        });

        mockvscode.setup(x => x.window).returns(() => {
            return windowMock.object;
        });

        let sbv = new sb.SoundBrowserSoundsView(config.object, mockvscode.object);

        test("commands", () => {
            [
                `${sb.TREE_VIEW_NAME}.selectNode`
                , ...["play","stop","copytoclipboard","insertineditor"].map(x => `tidalcycles.sounds.${x}`)
            ].forEach(cmd => {
                commandsMock.setup(x =>
                    x.registerCommand(cmd, TypeMoq.It.isAny()))
                    .returns(registerCommandMock)
                    .verifiable(TypeMoq.Times.once());
            });
            
            sbv.registerCommands();
            
            const getRegisteredFunction = (name:string): ((args: sb.SoundItem) => void) => {
                return registeredCommands[name];
            };

            let fun = getRegisteredFunction(`${sb.TREE_VIEW_NAME}.selectNode`);
            let item = TypeMoq.Mock.ofType<sb.SoundItem>();

            const dirtName = "dirty:42";
            item.setup(x => x.dirtName).returns(() => dirtName);

            fun(item.object);

            commandsMock.setup(x => x.executeCommand("tidalcycles.sounds.play", TypeMoq.It.isAny()))
                .verifiable(TypeMoq.Times.once());

            fun = getRegisteredFunction("tidalcycles.sounds.insertineditor");

            editorMock.setup(x => x.selection.isEmpty).returns(() => false).verifiable(TypeMoq.Times.atLeastOnce());
            editorMock.setup(x => x.selection).returns(() => {
                    const selection = TypeMoq.Mock.ofType<vscode.Selection>();
                    return selection.object;
                })
                .verifiable(TypeMoq.Times.atLeastOnce());

            const edit = TypeMoq.Mock.ofType<vscode.TextEditorEdit>();
            edit.setup(x => x.replace(TypeMoq.It.isAny(), dirtName)).verifiable(TypeMoq.Times.once());
            
            editorMock.setup(x => x.edit(TypeMoq.It.is(y => typeof y === 'function')))
                .returns(async (x) => {
                    x(edit.object);
                    return Promise.resolve(true);
                })
                .verifiable(TypeMoq.Times.once());

            fun(item.object);

            commandsMock.verifyAll();
            editorMock.verifyAll();
            edit.verifyAll();
        });

        test("players", () => {
            assert.exists(sbv.getPlayerFor("test.wav"));
        });

    });

});
