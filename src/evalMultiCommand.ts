import { Range, TextDocument, TextEditor, window, workspace } from 'vscode';
import { send } from './getRepl';

export const evalMultiCommand = async () => {
    const input = getExpressionUnderCursor(true);
    if (!input) {
        return;
    }
    //  const repl = await getRepl();
    send(input);
};

const isEmpty = (document: TextDocument, line: number): boolean => {
    return document.lineAt(line).text.trim().length === 0;
};

const getExpressionUnderCursor = (getMultiline: boolean): string | null => {
    const editor: TextEditor | undefined = window.activeTextEditor;

    if (!editor) {
        return null;
    }

    const document = editor.document;
    const position = editor.selection.active;
    const line = document.lineAt(position);

    if (!getMultiline) {
        if (isEmpty(document, position.line)) {
            return null;
        }
        const range = new Range(
            line.lineNumber,
            0,
            line.lineNumber,
            line.text.length
        );
        feedback(range);
        return document.getText(range);
    }

    const selectedRange = new Range(
        editor.selection.anchor,
        editor.selection.active
    );
    const startLineNumber = getStartLineNumber(document, selectedRange);
    if (startLineNumber === null) {
        return null;
    }

    const endLineNumber = getEndLineNumber(document, startLineNumber);
    const endCol = document.lineAt(endLineNumber).text.length;

    let range = new Range(startLineNumber, 0, endLineNumber, endCol);

    // bad place for this
    feedback(range);
    return document.getText(range);
};

function getStartLineNumber(
    document: TextDocument,
    range: Range
): number | null {
    // If current line is empty, search forward for the expression start
    if (isEmpty(document, range.start.line)) {
        return getFirstNonBlankLineInRange(document, range);
    }

    // Else, current line has contents and so Tidal expression may start on a prior line
    return getFirstExpressionLineBeforeSelection(document, range);
}

const getFirstExpressionLineBeforeSelection = (
    document: TextDocument,
    range: Range
): number | null => {
    let currentLineNumber = range.start.line;

    // If current line is empty, do not attempt to search.
    if (isEmpty(document, currentLineNumber)) {
        return null;
    }

    while (currentLineNumber >= 0 && !isEmpty(document, currentLineNumber)) {
        currentLineNumber--;
    }

    return currentLineNumber + 1;
};

const getFirstNonBlankLineInRange = (
    document: TextDocument,
    range: Range
): number | null => {
    for (
        let currentLineNumber = range.start.line;
        currentLineNumber <= range.end.line;
        currentLineNumber++
    ) {
        if (!isEmpty(document, currentLineNumber)) {
            return currentLineNumber;
        }
    }

    return null;
};

const getEndLineNumber = (
    document: TextDocument,
    startLineNumber: number
): number => {
    let currentLineNumber = startLineNumber;
    while (
        currentLineNumber < document.lineCount &&
        !isEmpty(document, currentLineNumber)
    ) {
        currentLineNumber++;
    }
    return currentLineNumber - 1;
};

const feedback = (range: Range): void => {
    const configuration = workspace.getConfiguration('tcpure');
    const flashColor = configuration.get<string>('flashDecoration', '#00ff00');

    const flashDecorationType = window.createTextEditorDecorationType({
        backgroundColor: flashColor,
    });

    const editor: TextEditor | undefined = window.activeTextEditor;

    if (!editor) {
        return;
    }

    editor.setDecorations(flashDecorationType, [range]);
    setTimeout(function () {
        flashDecorationType.dispose();
    }, 250);
};
