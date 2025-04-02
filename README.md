# TidalCycles for VSCode

Support for the TidalCycles in vscode. You can learn more about
TidalCycles at [TidalCycles](https://tidalcycles.org).

## Upgrading to 1.1

If you are upgrading from 1.04 to 1.1, you will need to install the latest version of SuperDirt unless you are using
your own custom Tidal boot file. The default boot will assign Tidal's `d1` through `d12` connections to 
SuperCollider orbits 0 through 11, respectively.

## Features

This VSCode extension for TidalCycles is inspired by the commands from the popular Atom package:

- `Shift+Enter` to evaluate a single line
- `Ctrl+Enter` to evaluate multiple lines
- `Ctrl+Alt+H` to hush

## Syntax Highlighting

In order to get syntax highlighting in `.tidal` files you must do
two things:

- Install the [Haskell Syntax Highlighting](https://marketplace.visualstudio.com/items?itemName=justusadam.language-haskell) extension
- Associate `.tidal` files to the Haskell language by adding the following 
settings in `settings.json`:

```
"files.associations": {
    "*.tidal": "haskell"
}
```

## Prerequisites

You will need to have TidalCycles (a Haskell package) installed before
using this extension. If you want to produce sound, you'll also
need to have SuperDirt running. You can find instructions to install
TidalCycles and SuperDirt at [TidalCycles](https://tidalcycles.org).

## Extension Settings

Take a look in the Contributions tab on the extension page to see what config setting options are available. Here is
a more verbose explanation of a few of them:

### GHCi path

Probably the most important setting. This is the path to `ghci.exe` on your machine. 
If it's on your OS `PATH`, then just setting this value to `ghci` will probably do fine.

Examples:

`"tidalcycles.ghciPath" : "ghci"`

`"tidalcycles.ghciPath" : "c:\\path\\to\\ghci.exe"`

`"tidalcycles.ghciPath" : "/path/to/ghci"`

If you are using Stack, you can enable the `useStackGhci` option and the extension will use `stack ghci` to launch GHCi.

### Boot Files

This extension has a default internal bootup process to load the Tidal libraries into GHCI.
If instead you wish you run your own bootup process, you can configure this extension to point
to a Tidal bootup file on your machine, or use a `BootTidal.hs` file located in the first directory
of your VS Code IDE.

* `tidalcycles.bootTidalPath` - path to a file that contains line-by-line commands to boot the TidalCycles Haskell package.
* `tidalcycles.useBootFileInCurrentDirectory` - when equal to `true`, the extension will boot from a file named `BootTidal.hs` in the first workspace folder

Examples:

```
"tidalcycles.bootTidalPath" : "c:\\path\\to\\file\\boot.tidal",
"tidalcycles.useBootFileInCurrentDirectory" : false
```

```
"tidalcycles.useBootFileInCurrentDirectory" : true
```

### Hover / completion support for Tidal statements

This extension implements some code support features for Tidal specific
statements, providing code completion and hover information.

You can set the detail level of the provided information through two
configuration settings, one for the `hover` feature and one for `completion`:

```
"tidalcycles.codehelp.hover.level": "FULL"
"tidalcycles.codehelp.completion.level" : "FULL"
```

Available levels for both options are:

 * `OFF`: Disables the feature
 * `FULL`: Enables all available information 
 * `NO_EXAMPLES_NO_LINKS`: Only show command format, parameters and return value
                           information
 * `MINIMUM`: Only show command format information

#### Writing new documentation

Not every command is documented yet and the detail level of the documentation
varies from command to command. The files [commands.yaml](commands.yaml) and
[commands-generated.yaml](commands-generated.yaml) contain the currently
available documentation. If you'd like to contribute, please add new
documentation to [commands.yaml](commands.yaml).

The easiest way to do this is by creating a new file and adding it to the
`tidalcycles.codehelp.commands.extra` list. The files in this list will be read
in addition to the defaults contained in the extension itself. This way you can
start writing and using documentation without actually having to re-compile the
extension.

For the format take a look at the existing documentation and the source code.
Most fields support MarkDown syntax as well, so you can style them.

If you want to see how your documentation looks, simply reload the file by
executing the `tidal.codehelp.reload`. Look out for error messages popping up
and if there are none you should see your changes immediately.

### Full Config Example

```
{
    "tidalcycles.ghciPath" : "ghci",
    "tidalcycles.evalCountPrefix": "Evals: ",
    "tidalcycles.feedbackColor": "rgba(100,250,100,0.5)",
    "tidalcycles.useStackGhci": false,
    "tidalcycles.showEvalCount": true,
    "tidalcycles.showGhciOutput": false,
    "tidalcycles.showOutputInConsoleChannel": true,
    "tidalcycles.useBootFileInCurrentDirectory": false,
    "tidalcycles.bootTidalPath" : "c:\\path\\to\\file\\boot.tidal",
    "tidalcycles.codehelp.hover.level": "FULL",
    "tidalcycles.codehelp.completion.level" : "FULL"
}
```

## Known Issues

- The `Eval and Copy` and `Eval Multi Line and Copy` commands from the Atom package are not supported.