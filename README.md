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

### Customizable shortcuts

You have 9 customizable, predefined shortcuts for executing commands e.g. through key combinations. By default
the shortcuts are initially set up to do the following (you can change them to your liking though):

1. `silence` the current stream
2. `mute` the current stream
3. `unmute` the current stream
4. `solo` the current stream
5. `unsolo` the current stream
6. `unsolo` and `unmute` streams 1 to 12
7. `xfadeIn` the block to the current stream over 4 cycles (see below)
8. `xfadeIn` `silence` to the current stream over 4 cycles. Effectively this is a fade out
9. The more complex example below

The current stream number is determined by checking for a `d1`, `d2`, etc. at the beginning of the first line of the
code block the cursor is currently in. This number is then taken as the current stream number, sans the `d`.

You can use the stream number in the commands by putting a `#s#` at the position you want the number to be. Note that
it is replaced by the number only, no spaces are added. So if you're on stream `4` and you have a shortcut command
that's defined as `d#s# $ ((1/#s#) ~>) $ s \"bd\" # speed #s#` it'll be translated to
`d4 $ ((1/4) ~>) $ s \"bd\" # speed 4` before being sent to Tidal (see default command 9).

Another useful replacement value is `#c#` which is the remainder of the command after the first `$` or `#`. This makes
it easy to set up shortcuts for transitions. The following shortcut will cross fade in the block under the cursor over 4
cycles:

```
xfadeIn #s# 4 $ #c#
```

Note that the extension **does not come with default key bindings** as to not interfere with your current key bindings.
In order to execute the commands through key combinations you need to wire them up in the `Keyboard Shortcut`
preferences.

If the 9 predefined shortcut commands are not enough, you can also define new ones by creating new keyboard mappings.
Defining a shortcut like this also has the added benefit of allowing for multiple, top level commands to be specified in
the same shortcut. Below is an example that needs to go into your `keybindings.json` file. Note the `\r\n` added to
define two top level commands in the same shortcut.

```
{
    "key": "shift+ctrl+1"
    , "command": "tidal.shortcut"
    , "args": {
        "command": "d1 $ stack [ s \"bd!4\", ((1/2) ~>) $ s \"sn!2\" ]\r\nd2 $ s \"hh!8\""
    }
}
```

### Sound browser

You can configure a custom tree view for sounds that you might want to use. At
the moment only locally available samples can be added to the view. To do so
you need to add the path where your samples can be found to the configuration
and then **restart vscode**:

```
{
    "settings": {
        "tidalcycles.sounds.paths": [
            "/path/to/Dirt-Samples"
            , "/path/to/other/samples"
        ]
    }
}
```

The sound browser view is visible in the `Tidal Cycles` Activity Bar, just click
on the TidalCycles logo there.

In you sample tree view you'll only see one level of folders per specified
sample directory. This is intentional, as SuperDirt also only supports one
level at the moment.

Samples in a folder are displayed in a format specific to Tidalcycles/SuperDirt.
Here's an example for the `casio` folder from the `Dirt-Samples`:

```
> casio
    casio:0 / high
    casio:1 / low
    casio:2 / noise
```

The first part of the name is how you can reference the sound in TidalCycles (
provided that the folder is configured in SuperDirt as well). The second
displayed part after the slash is the actual file name, stripped from its
extension and any numeric prefix. If you hover the mouse over an item you'll get
the actual, full file name in the title.

To play a sound you can just click on the sound item (supported on Linux, macOS,
Windows 10, others might work too). Click again to re-launch the sound. If you
want to stop the sound you can either hit the `Escape` key or click on the
![Stop](images/material-icons/stop_lt.svg) button in the title bar oof the tree
view. This feature can be turned off by setting the
`tidalcycles.sounds.playonselection` parameter to `false`.

Every sound also has some actions that you can execute by clicking on the
respective icon displayed to the right, when you hover over an item:

 - ![Arrow right](images/material-icons/arrowr_lt.svg): Insert the sound or
    folder name in the currently active editor.
 - ![Clipboard](images/material-icons/clipboard_lt.svg): Copy the sound or
    folder name to the clipboard.
 - ![Play](images/material-icons/play_lt.svg): Play the sound. This is helpful
    if you turned off the automatic playing of a sound when you click it (see
    above).

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