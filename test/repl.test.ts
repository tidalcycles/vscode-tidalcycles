import { Position, Selection } from 'vscode';
import * as TypeMoq from 'typemoq';
import { createMockDocument, createMockEditor, createMockCreateTextEditorDecorationType } from './mock';
import { Repl, splitCommands, replaceTemplateValues, extractTemplateValues } from '../src/repl';
import { ITidal } from '../src/tidal';
import { IHistory } from '../src/history';
import { Config } from '../src/config';
import { assert } from 'chai';


suite('Repl', () => {
    test('Hush executed in .tidal file', async () => {
        let mockTidal = TypeMoq.Mock.ofType<ITidal>();
        let mockConfig = TypeMoq.Mock.ofType<Config>();
        let mockDocument = createMockDocument(['Hello world']);
        let mockEditor = createMockEditor(mockDocument.object, new Selection(new Position(0, 0), new Position(0, 0)));
        let mockHistory = TypeMoq.Mock.ofType<IHistory>();
        let mockCreateTextEditorDecorationType = createMockCreateTextEditorDecorationType();

        mockDocument.setup(d => d.fileName).returns(() => 'myfile.tidal');

        let repl = new Repl(mockTidal.object, mockEditor.object, mockHistory.object, 
            mockConfig.object, mockCreateTextEditorDecorationType.object);
        await repl.hush();

        mockTidal.verify(t => t.sendTidalExpression('hush'), TypeMoq.Times.once());
        mockHistory.verify(h => h.log(TypeMoq.It.isAny()), TypeMoq.Times.once());
    });

    test('Hush not executed in non-.tidal file', async () => {
        let mockTidal = TypeMoq.Mock.ofType<ITidal>();
        let mockConfig = TypeMoq.Mock.ofType<Config>();
        let mockDocument = createMockDocument(['Hello world']);
        let mockEditor = createMockEditor(mockDocument.object, new Selection(new Position(0, 0), new Position(0, 0)));
        let mockHistory = TypeMoq.Mock.ofType<IHistory>();
        let mockCreateTextEditorDecorationType = createMockCreateTextEditorDecorationType();

        mockDocument.setup(d => d.fileName).returns(() => 'myfile.ideal');

        let repl = new Repl(mockTidal.object, mockEditor.object, mockHistory.object, 
            mockConfig.object, mockCreateTextEditorDecorationType.object);
        await repl.hush();

        mockTidal.verify(t => t.sendTidalExpression(TypeMoq.It.isAnyString(), TypeMoq.It.isAny()), TypeMoq.Times.never());
        mockHistory.verify(h => h.log(TypeMoq.It.isAny()), TypeMoq.Times.never());
    });

    test('Expression not evaluated in non-.tidal file', async () => {
        let mockTidal = TypeMoq.Mock.ofType<ITidal>();
        let mockConfig = TypeMoq.Mock.ofType<Config>();
        let mockDocument = createMockDocument(['Foo', 'bar', '', 'baz']);
        let mockEditor = createMockEditor(mockDocument.object, new Selection(new Position(1, 0), new Position(1, 2)));
        let mockHistory = TypeMoq.Mock.ofType<IHistory>();
        let mockCreateTextEditorDecorationType = createMockCreateTextEditorDecorationType();

        mockDocument.setup(d => d.fileName).returns(() => 'myfile.ideal');

        let repl = new Repl(mockTidal.object, mockEditor.object, mockHistory.object, 
            mockConfig.object, mockCreateTextEditorDecorationType.object);
        await repl.evaluate(false);

        mockTidal.verify(t => t.sendTidalExpression(TypeMoq.It.isAnyString()), TypeMoq.Times.never());
        mockHistory.verify(h => h.log(TypeMoq.It.isAny()), TypeMoq.Times.never());
    });

    test('Multi-line expression evaluated in .tidal file', async () => {
        let mockTidal = TypeMoq.Mock.ofType<ITidal>();
        let mockConfig = TypeMoq.Mock.ofType<Config>();
        let mockDocument = createMockDocument(['Foo', 'bar', '', 'baz']);
        let mockEditor = createMockEditor(mockDocument.object, new Selection(new Position(1, 0), new Position(1, 2)));
        let mockHistory = TypeMoq.Mock.ofType<IHistory>();
        let mockCreateTextEditorDecorationType = createMockCreateTextEditorDecorationType();

        mockDocument.setup(d => d.fileName).returns(() => 'myfile.tidal');

        let repl = new Repl(mockTidal.object, mockEditor.object, mockHistory.object, 
            mockConfig.object, mockCreateTextEditorDecorationType.object);
        await repl.evaluate(true);

        mockTidal.verify(t => t.sendTidalExpression('Foo\r\nbar', false), TypeMoq.Times.once());
        mockHistory.verify(h => h.log(TypeMoq.It.isAny()), TypeMoq.Times.once());
    });

    test('Single-line expression evaluated in .tidal file', async () => {
        let mockTidal = TypeMoq.Mock.ofType<ITidal>();
        let mockConfig = TypeMoq.Mock.ofType<Config>();
        let mockDocument = createMockDocument(['Foo', 'bar', '', 'baz']);
        let mockEditor = createMockEditor(mockDocument.object, new Selection(new Position(1, 0), new Position(1, 2)));
        let mockHistory = TypeMoq.Mock.ofType<IHistory>();
        let mockCreateTextEditorDecorationType = createMockCreateTextEditorDecorationType();

        mockDocument.setup(d => d.fileName).returns(() => 'myfile.tidal');

        let repl = new Repl(mockTidal.object, mockEditor.object, mockHistory.object, 
            mockConfig.object, mockCreateTextEditorDecorationType.object);
        await repl.evaluate(false);

        mockTidal.verify(t => t.sendTidalExpression('bar', false), TypeMoq.Times.once());
        mockHistory.verify(h => h.log(TypeMoq.It.isAny()), TypeMoq.Times.once());
    });

    test('Command splitting', async () => {
        let commands = splitCommands("hello -- comment\r\nworld -- comment\r\n  foo\r\n    bar\r\n  baz\r\nlast");

        assert.isArray(commands);
        assert.lengthOf(commands, 3);
        commands.forEach((x, i) => {
            assert.typeOf(x, 'object', `Expected command ${i} to be an object`);
            assert.hasAllKeys(x, ["expression","range"], `Expected command ${i} to look like a TidalExpression`);
        });
        assert.equal(commands[0].expression, "hello -- comment");
        assert.equal(commands[1].expression, "world -- comment\r\n  foo\r\n    bar\r\n  baz");
        assert.equal(commands[2].expression, "last");

        commands = splitCommands("hello -- comment\r\n  something");
        assert.isArray(commands);
        assert.lengthOf(commands, 1);
        assert.equal(commands[0].expression, "hello -- comment\r\n  something");

    });

    test('Template replacements', async () => {
        assert.equal(replaceTemplateValues("#a#",{"a":"foo"},/#([ab])#/g), "foo");
        assert.equal(replaceTemplateValues("#a#b#",{"a":"foo"},/#([ab])#/g), "foob#");
        assert.equal(replaceTemplateValues("b#a#",{"a":"foo"},/#([ab])#/g), "bfoo");
        assert.equal(replaceTemplateValues("b#a#c#a#",{"a":"foo"},/#([ab])#/g), "bfoocfoo");
    });

    test('Template extraction', async () => {
        assert.deepEqual(extractTemplateValues("d1 $\r\n  foobar $ baz"), {"s": "1", "c": "\r\n  foobar $ baz"});
        assert.deepEqual(extractTemplateValues("d1 $\r\n  foobar # baz"), {"s": "1", "c": "\r\n  foobar # baz"});
        assert.deepEqual(extractTemplateValues("d1 #\r\n  foobar # baz"), {"s": "1", "c": "\r\n  foobar # baz"});
        assert.deepEqual(extractTemplateValues("d1 #\r\n  foobar $ baz"), {"s": "1", "c": "\r\n  foobar $ baz"});
        assert.deepEqual(extractTemplateValues("xfadeIn 2 10 $\r\n  foobar"), {"s": "2", "c": "\r\n  foobar"});
        assert.deepEqual(extractTemplateValues("jump' 3 $\r\n  foobar"), {"s": "3", "c": "\r\n  foobar"});
    });


});
