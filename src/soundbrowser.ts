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

    constructor(
        public readonly root: string
        , public readonly type: ('virt' | 'dir' | 'file')
        , public readonly position: number
        , public readonly fileName: string
        , public readonly filePath: string
        , public readonly prettyName: string
        , public readonly collapsibleState: vscode.TreeItemCollapsibleState
        , public readonly contextValue?: string
        , public readonly parent?: SoundItem
    ){
        super(
            prettyName
            , collapsibleState
        );
        this.tooltip = fileName;
        this.label = prettyName;

        if(type === 'file'){
            const dirName = path.basename(path.dirname(filePath));
            this.label = `${this.dirtName} / ${prettyName}`;
            this.tooltip = path.join(dirName, fileName);

            this.command = {
                command: `${TREE_VIEW_NAME}.selectNode`
                , title: "Play"
                , arguments: [this]
            };
        }
        else {
            this.numChildren = 0;
        }

        this.resourceUri = vscode.Uri.parse(filePath.indexOf('://') >=0 ? filePath : `file://${filePath}`);
        this.contextValue = contextValue;
        this.id = root+":"+this.resourceUri;
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
            return this.fileName;
        }
        return `${path.basename(path.dirname(this.filePath))}:${this.position}`;
    }

    get virtPath(): string {
        return SoundItem.makeVirtPath(this.root, this.fileName, this.parent);
    }

    static makeVirtPath(root: string, fileName: string, parent?: SoundItem){
        const ppath = parent ? parent.virtPath : root;
        return path.join(ppath, fileName);
    }
}


function instanceOfSoundItem(object: vscode.TreeItem): object is SoundItem {
    const keys = Object.keys(object).reduce((x, y) => {x[y] = true; return x;}, {} as ({[key:string]:boolean}));
    return ["fileName"].filter(x => keys[x]).length > 0;
}

export const TREE_VIEW_NAME = "tidalcycles-soundbrowser-sounds";

export class SoundBrowserSoundsView implements vscode.TreeDataProvider<SoundItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<SoundItem | undefined> = new vscode.EventEmitter<SoundItem | undefined>();
	readonly onDidChangeTreeData: vscode.Event<SoundItem | undefined> = this._onDidChangeTreeData.event;

    private _treeView?: vscode.TreeView<SoundItem>;
    private currentSelection: SoundItem[] = [];
    private lastPlayed: string | undefined;

    constructor(
        private config: Config
    ){}

    public createTreeView(){
        const dispoables = [];

        this._treeView = vscode.window.createTreeView<SoundItem>(
            TREE_VIEW_NAME
            , {
                treeDataProvider: this
                , showCollapseAll: true
            }
        );
        dispoables.push(this._treeView);

        dispoables.push(this._treeView.onDidChangeSelection(e => {
            this.currentSelection = e.selection;
        }));

        dispoables.push(this._treeView.onDidCollapseElement(e => {
            this.toggleCollapse(e.element, true);
        }));

        dispoables.push(this._treeView.onDidExpandElement(e => {
            this.toggleCollapse(e.element, false);
        }));

        return dispoables;
    }

    private toggleCollapse(item: SoundItem, collapsed: boolean){
        let xl = this.getExpansionList();

        if(collapsed){
            delete xl[item.virtPath];
        }
        else {
            xl[item.virtPath] = true;
        }

        this.setExpansionList(xl);
    }

    private getExpansionList() {
        let expandedList = this.config.getWorkspaceState(this.getMyStateKey("expanded"));
        if(!expandedList){
            expandedList = {};
        }
        return expandedList as ({[key:string]: boolean});
    }

    private setExpansionList(list: ({[key:string]: boolean})){
        this.config.updateWorkspaceState(this.getMyStateKey("expanded"), list);
    }

    private getMyStateKey(key: string){
        return `soundbrowser.${key}`;
    }

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
                    try {
                        WavPlayer.stop();
                    }
                    catch(e){
                        // no need to do anything here
                    }
                }
                
                const item = (node.filter(x => instanceOfSoundItem(x)).pop()) as SoundItem;
                
                if(item && item.type === 'file'){
                    if(!this.lastPlayed || item.id !== this.lastPlayed){
                        this.lastPlayed = item.id;
                        WavPlayer.play({path: item.filePath, sync: true})
                            .then(() => {
                                this.lastPlayed = undefined;
                            })
                            .catch((err:any) => {
                                vscode.window.showErrorMessage(`Error playing wav: ${err}`);
                            });
                    }
                    else {
                        this.lastPlayed = undefined;
                    }
                }
                
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

    refresh(): void {
		this._onDidChangeTreeData.fire();
	}

    refreshElement(element: SoundItem): void {
        if(element.type === 'file'){
            return;
        }
    }

    getTreeItem(element: SoundItem): vscode.TreeItem {
        return element;
    }

    getChildren(element?: SoundItem): Thenable<SoundItem[]> {
        if(element){
            if(element.type === 'file'){
                return Promise.resolve([]);
            }
            else if (element.type === 'dir') {
                return this.getVirtEntries(element.root, element);
            }
            else if (element.type === 'virt') {
                return this.getVirtEntries(element.root, element);
            }
            return Promise.resolve([]);
        }
        
        const dpaths = this.config.getSoundsPaths();

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

        const xl = this.getExpansionList();

        const entries = Promise.resolve(dpaths.map((x, i) => {
            const root = (""+i).padStart(3, "0") + "_" + (x.startsWith(':') ? x : path.basename(x));
            return new SoundItem(
                root
                , 'virt'
                , i
                , x
                , x
                , x.startsWith(':') ? x : path.basename(x)
                , dpaths.length === 1 || xl[SoundItem.makeVirtPath(root, x)]
                    ? vscode.TreeItemCollapsibleState.Expanded
                    : vscode.TreeItemCollapsibleState.Collapsed
                , 'virt'
            );
        }));

        return entries;
    }

    private async getVirtEntries(root: string, parent: SoundItem): Promise<SoundItem[]> {
        const vpath = parent.filePath;
        
        if(parent.root.toLowerCase().startsWith(":superdirt")){
            vscode.window.showErrorMessage(
                "Fetching sound information from SuperDirt is currently not supported."
                , "Configure sounds paths"
            ).then(x => 
                vscode.commands.executeCommand(
                    "workbench.action.openSettings"
                    , `@ext:${this.config.getExtensionId()} ${this.config.getPreferencesStringFor("sounds.paths")}`
                )
            );
            return [];
        }
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

                const xl = this.getExpansionList();

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
                            return true;
                        }
                        return fn.match(/\.(wav|ogg|mp3|aif)$/i);
                    })
                    .map(({fn, stat}, i) => {
                        const isDir = stat && !stat.isFile();
                        
                        return new SoundItem(
                            parent.root
                            , isDir ? 'dir' : 'file'
                            , i
                            , fn
                            , path.join(vpath, fn)
                            , isDir ? fn : fn.replace(/^(\s|\d)*[_]+\s*/i,'').replace(/\.[^.]+$/i,'')
                            , isDir ?
                                (xl[SoundItem.makeVirtPath(parent.root, fn, parent)]
                                    ? vscode.TreeItemCollapsibleState.Expanded
                                    : vscode.TreeItemCollapsibleState.Collapsed
                                )
                                : vscode.TreeItemCollapsibleState.None
                            , isDir ? 'dir' : 'wav'
                            , parent
                        );
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
