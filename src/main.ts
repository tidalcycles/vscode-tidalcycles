import {
  TextEditor,
  ExtensionContext,
  window,
  commands,
  languages,
  Range,
} from "vscode";
import { Repl, splitCommands } from "./repl";
import { Logger } from "./logging";
import { Config } from "./config";
import { Ghci } from "./ghci";
import { Tidal } from "./tidal";
import { History } from "./history";
import { TidalLanguageHelpProvider } from "./codehelp";

export function activate(context: ExtensionContext) {
  const config = new Config(context);
  const logger = new Logger(window.createOutputChannel("TidalCycles"));

  const ghci = new Ghci(
    logger,
    config.useStackGhci(),
    config.ghciPath(),
    config.showGhciOutput(),
  );
  const tidal = new Tidal(
    logger,
    ghci,
    config.bootTidalPath(),
    config.useBootFileInCurrentDirectory(),
  );
  const history = new History(logger, config);

  const hoveAndMarkdownProvider = new TidalLanguageHelpProvider(
    context.extensionPath,
    config,
  );

  [
    languages.registerHoverProvider,
    languages.registerCompletionItemProvider,
  ].forEach((regFunc: (selector: any, provider: any) => void) => {
    regFunc({ scheme: "*", pattern: "**/*.tidal" }, hoveAndMarkdownProvider);
  });

  function getRepl(
    repls: Map<TextEditor, Repl>,
    textEditor: TextEditor | undefined,
  ): Repl | undefined {
    if (textEditor === undefined) {
      return undefined;
    }
    if (!repls.has(textEditor)) {
      repls.set(
        textEditor,
        new Repl(
          tidal,
          textEditor,
          history,
          config,
          window.createTextEditorDecorationType,
        ),
      );
    }
    return repls.get(textEditor);
  }

  const repls = new Map<TextEditor, Repl>();

  if (config.showOutputInConsoleChannel()) {
    ghci.stdout.on("data", (data: any) => {
      logger.log(`${data}`, false);
    });

    ghci.stderr.on("data", (data: any) => {
      logger.warning(`GHCi | ${data}`);
    });
  }

  const evalSingleCommand = commands.registerCommand(
    "tidal.eval",
    function (args?: { [key: string]: any }) {
      const repl = getRepl(repls, window.activeTextEditor);

      if (repl !== undefined) {
        if (typeof args !== "undefined") {
          let command = Object.keys(args)
            .filter((x) => x === "command")
            .map((x) => args[x])
            .pop() as string | undefined;
          if (typeof command !== "undefined") {
            let range = Object.keys(args)
              .filter((x) => x === "range")
              .map((x) => args[x])
              .pop() as Range | undefined;
            if (typeof range === "undefined") {
              range = new Range(0, 0, 0, 0);
            }

            const expressions = splitCommands({ cmd: command, range });
            expressions.forEach((x) => repl.evaluateExpression(x, true));
          }

          return;
        }

        repl.evaluate(false);
      }
    },
  );

  const evalMultiCommand = commands.registerCommand(
    "tidal.evalMulti",
    function () {
      const repl = getRepl(repls, window.activeTextEditor);
      if (repl !== undefined) {
        repl.evaluate(true);
      }
    },
  );

  const hushCommand = commands.registerCommand("tidal.hush", function () {
    const repl = getRepl(repls, window.activeTextEditor);
    if (repl !== undefined) {
      repl.hush();
    }
  });

  context.subscriptions.push(
    evalSingleCommand,
    evalMultiCommand,
    hushCommand,
    ...hoveAndMarkdownProvider.createCommands(),
  );
}

export function deactivate() {}
