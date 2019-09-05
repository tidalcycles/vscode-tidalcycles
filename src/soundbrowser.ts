import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

import { Config } from "./config";

const WavPlayer = require('node-wav-player');

/*
Based on example code:
https://github.com/microsoft/vscode-extension-samples/blob/master/tree-view-sample
*/

export class SoundItem extends vscode.TreeItem {
    private _numChildren: number = 0;

    public readonly type: ('virt' | 'dir' | 'sound');
    public readonly position: number;
    public readonly itemName: string;
    public readonly fullPath: string;
    public readonly prettyName: string;
    public readonly virtualRoot: string;
    public readonly parent?: SoundItem;

    constructor(config: ({
        virtualRoot: string
        , type: ('virt' | 'dir' | 'sound')
        , position: number
        , fullPath: string
        , parent?: SoundItem
    })){
        super(
            ""
            , config.type === 'sound'
                ? vscode.TreeItemCollapsibleState.None
                : (
                    !config.parent || config.parent.type === 'virt'
                        ? vscode.TreeItemCollapsibleState.Collapsed
                        : vscode.TreeItemCollapsibleState.None
                )
        );

        this.virtualRoot = config.virtualRoot;
        this.fullPath = config.fullPath;
        this.itemName = path.basename(this.fullPath);
        this.type = config.type;
        this.contextValue = config.type;
        this.prettyName = this.type === 'sound'
            ? this.itemName.replace(/^(\s|\d)*[_]+\s*/i,'').replace(/\.[^.]+$/i,'')
            : this.itemName;
        this.tooltip = this.itemName;
        this.position = config.position;
        this.label = this.prettyName;

        this.id = SoundItem.makeId(this.virtualRoot, this.fullPath);
        this.resourceUri = SoundItem.makeResourceUri(this.fullPath);

        if(this.type === 'sound'){
            this.label = `${this.dirtName} / ${this.prettyName}`;
            this.tooltip = this.virtPath;

            this.command = {
                command: `${TREE_VIEW_NAME}.selectNode`
                , title: "Play"
                , arguments: [this]
            };
        }
        else {
            this.numChildren = 0;
        }
    }

    static makeId(root: string, filePath: string){
        return root+"#"+this.makeResourceUri(filePath);
    }

    static makeResourceUri(filePath: string){
        return vscode.Uri.parse(filePath.indexOf('://') >=0 ? filePath : `file://${filePath}`);
    }

    get numChildren(): number {
        return this._numChildren;
    }

    set numChildren(v: number) {
        this._numChildren = v;
        //this.label = `${this.prettyName} (${this._numChildren})`;
    }

    get dirtName(): string | undefined {
        if(this.type === 'virt'){
            return undefined;
        }
        if(this.type === 'dir'){
            return this.itemName;
        }
        return `${path.basename(path.dirname(this.fullPath))}:${this.position}`;
    }

    get virtPath(): string {
        return SoundItem.makeVirtPath(this.itemName, this.parent);
    }

    static makeVirtPath(itemName: string, parent?: SoundItem){
        const ppath = parent ? parent.virtPath : "";
        return path.join(ppath, itemName);
    }
}

function instanceOfSoundItem(object: vscode.TreeItem): object is SoundItem {
    const keys = Object.keys(object).reduce((x, y) => {x[y] = true; return x;}, {} as ({[key:string]:boolean}));
    return ["itemName"].filter(x => keys[x]).length > 0;
}

interface SoundTreeProvider {
    getEntries(parent: SoundItem, playerFilter: (filePath:string) => boolean): Promise<SoundItem[]>;
}

interface SoundPlayer {
    match: RegExp;
    play: (item: SoundItem) => Promise<void>;
    stop: () => Promise<void>;
}

export const TREE_VIEW_NAME = "tidalcycles-soundbrowser-sounds";

export class SoundBrowserSoundsView implements vscode.TreeDataProvider<SoundItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<SoundItem | undefined> = new vscode.EventEmitter<SoundItem | undefined>();
	readonly onDidChangeTreeData: vscode.Event<SoundItem | undefined> = this._onDidChangeTreeData.event;

    private _treeView?: vscode.TreeView<SoundItem>;
    private currentSelection: SoundItem[] = [];

    private readonly virtualRoots: ({[id: string]: {
        displayName: string
        , provider: SoundTreeProvider
        , root: SoundItem
    }}) = {};
    // private expansionList: ({[virt:string]:({[key:string]:boolean})}) = {};

    private players: ({[name: string]: SoundPlayer}) = {
        "wav": {
            match: /\.(wav|ogg|mp3|aif)$/i
            , play: async (item: SoundItem) => {
                return WavPlayer.play({path: item.fullPath, sync: true});
            }
            , stop: async () => {
                try {
                    WavPlayer.stop();
                }
                catch(e){
                    // no need to do anything here
                }
                return Promise.resolve();
            }
        }
    };

    constructor(
        private config: Config
    ){
    }

    public createTreeView(){
        const disposables = [];

        this._treeView = vscode.window.createTreeView<SoundItem>(
            TREE_VIEW_NAME
            , {
                treeDataProvider: this
                , showCollapseAll: true
            }
        );

        disposables.push(this._treeView);

        disposables.push(this._treeView.onDidChangeSelection(e => {
            this.currentSelection = e.selection;
        }));

        disposables.push(this._treeView.onDidCollapseElement(e => {
            //this.setExpanded(e.element, false);
        }));

        disposables.push(this._treeView.onDidExpandElement(e => {
            //this.setExpanded(e.element);
        }));

        /*
        let stateList = this.config.getWorkspaceState(this.getMyStateKey("expanded"));
        if(stateList){
            if(typeof stateList === 'object' && stateList !== null){
                if(Object.keys(stateList).filter(x => typeof x !== 'string').length === 0){
                    this.expansionList = stateList as any;
                }
            }
        }
        */

        return disposables;
    }

    /*
    private getMyStateKey(key: string){
        return `soundbrowser.${key}`;
    }*/

    public registerCommands(){
        return [
            vscode.commands.registerCommand("tidalcycles.sounds.play", (node?: vscode.TreeItem | vscode.TreeItem[]) => {
                if(!node){
                    node = this.currentSelection;
                }
                if(!Array.isArray(node)){
                    node = [node];
                }
                
                if(node.length > 0){
                    this.stopPlayers();
                }
                
                const item = (node.filter(x => instanceOfSoundItem(x)).pop()) as SoundItem;
                
                if(item && item.type === 'sound'){
                    const player = this.getPlayerFor(item.itemName);
                    if(player){
                        player.play(item)
                            .catch((err:any) => {
                                vscode.window.showErrorMessage(`Error playing sound ${item.itemName}: ${err}`);
                            });
                    }
                    else {
                        vscode.window.showErrorMessage(`No player available for ${item.itemName}`);
                    }
                }
                
            })
            , vscode.commands.registerCommand("tidalcycles.sounds.stop", (node?: vscode.TreeItem | vscode.TreeItem[]) => {
                this.stopPlayers();
            })
            , vscode.commands.registerCommand("tidalcycles.sounds.refresh", (node?: SoundItem) => {
                if(!node){
                    return;
                }
                this.refreshElement(node);
            })
            , vscode.commands.registerCommand("tidalcycles.sounds.copytoclipboard", (node?: SoundItem) => {
                if(!node){
                    return;
                }
                const dn = node.dirtName;
                if(!dn){
                    return;
                }
                vscode.env.clipboard.writeText(dn);
            })
            , vscode.commands.registerCommand("tidalcycles.sounds.insertineditor", (node?: SoundItem) => {
                if(!node){
                    return;
                }
                const dn = node.dirtName;
                if(!dn){
                    return;
                }
                const editor = vscode.window.activeTextEditor;
                if(!editor){
                    return;
                }
                if(editor.selection.isEmpty){
                    const activePos = editor.selection.active;
                    editor.edit(eb => {
                        eb.insert(activePos, dn);
                    });
                }
                else {
                    const selectionRange = editor.selection;
                    editor.edit(eb => {
                        eb.replace(selectionRange, dn);
                    });
                }
            })
            , vscode.commands.registerCommand(`${TREE_VIEW_NAME}.selectNode`, (node?: SoundItem) => {
                if(this.config.getPlaySoundOnSelection()){
                    vscode.commands.executeCommand("tidalcycles.sounds.play", node);
                }
            })
        ];
    }

    private stopPlayers(){
        Object.entries(this.players).forEach(([name, player]) => {
            player.stop();
        });
    }

    refresh(): void {
		this._onDidChangeTreeData.fire();
	}

    refreshElement(element: SoundItem): void {
        if(element.type === 'sound'){
            return;
        }
    }

    getTreeItem(element: SoundItem): vscode.TreeItem {
        return element;
    }

    getParent(element: SoundItem) {
        return element.parent;
    }

    getChildren(element?: SoundItem): Thenable<SoundItem[]> {
        if(element){
            if(element.type === 'sound'){
                return Promise.resolve([]);
            }
            else if (element.type === 'dir' || element.type === 'virt') {
                return this.virtualRoots[element.virtualRoot].provider.getEntries(
                    element
                    , fn => {
                        return  typeof (this.getPlayerFor(fn)) !== 'undefined';
                    });
            }
            return Promise.resolve([]);
        }
        
        const dpaths = this.config.getSoundsPaths();

        for(let i=0;i<dpaths.length;i++){
            const fi = dpaths.indexOf(dpaths[i]);
            let li;

            while((li = dpaths.indexOf(dpaths[i], fi+1)) > 0){
                dpaths.splice(li);
            }
        }

        if(dpaths.length === 0){
            vscode.window.showWarningMessage(
                "You haven't configured any Tidal sound paths yet."
                , "Configure sounds paths"
            ).then(x => 
                vscode.commands.executeCommand(
                    "workbench.action.openSettings"
                    , `@ext:${this.config.getExtensionId()} ${this.config.getPreferencesStringFor("sounds.paths")}`
                )
            );
        }

        const entries = Promise.resolve(dpaths.map((fullPath, i) => {
            const root = new SoundItem({
                virtualRoot: fullPath
                , type: 'virt'
                , position: i
                , fullPath
            });

            this.virtualRoots[fullPath] = {
                displayName: (fullPath.startsWith(':') ? fullPath : path.basename(fullPath))
                , provider: new FileSystemSoundTreeProvider()
                , root: root
            };

            return root;
        }));

        return entries;
    }

    private getPlayerFor(fn: string){
        let res = Object.entries(this.players)
            .map(([name, player], i) => ({
                i
                , player
                , matched: i === 0 ? (fn.match(player.match) !== null) : false
            }))
            .reduce((x, y) => {
                if(x.matched){
                    return x;
                }

                return (x.i === 0 ? [x, y] : [y])
                    .filter(p => fn.match(p.player.match))
                    .map(p => ({...p, matched: true}))
                    .reverse()
                    .pop()
                    || x;
            });
        if(res.matched){
            return res.player;
        }
        return undefined;
    }

}


class FileSystemSoundTreeProvider implements SoundTreeProvider {
    async getEntries(parent: SoundItem, playerFilter: (filePath:string) => boolean): Promise<SoundItem[]>{
        const vpath = parent.fullPath;

        if(!this.pathExists(vpath)){
            vscode.window.showErrorMessage(`The path you defined for loading dirt sound information does not exist: ${vpath}`);
            return [];
        }

        return new Promise<SoundItem[]>((resolve, reject) => {
            fs.readdir(vpath, (err, files) => {
                if(err){
                    reject(err);
                    return;
                }

                const filteredFiles =  files
                    .sort()
                    .map((fn, i) => {
                        try {
                            return ({fn, stat: fs.statSync(path.join(vpath, fn))});
                        }
                        catch(e){
                            return ({fn, stat: undefined});
                        }
                    })
                    .filter(({fn, stat}) => {
                        if(!stat){
                            return false;
                        }
                        if(!(stat.isDirectory() || stat.isFile())){
                            return false;
                        }
                        if(fn[0] === "."){
                            return false;
                        }
                        if(stat.isDirectory()){
                            return !parent || parent.type === 'virt';
                        }
                        return playerFilter(fn);
                    })
                    .map(({fn, stat}, i) => {
                        const isDir = stat && !stat.isFile();
                        const filePath = path.join(vpath, fn);
                        
                        return new SoundItem({
                            virtualRoot: parent.virtualRoot
                            , type: isDir ? 'dir' : 'sound'
                            , position: i
                            , fullPath: filePath
                            , parent
                        });
                    });

                parent.numChildren = filteredFiles.length;

                resolve(filteredFiles);
            });
        });
    }

    private pathExists(p: string): boolean {
		try {
			fs.accessSync(p);
		} catch (err) {
			return false;
		}

		return true;
	}
}
