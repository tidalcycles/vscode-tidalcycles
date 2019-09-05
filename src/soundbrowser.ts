import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

import { Config } from "./config";

/*
Based on example code:
https://github.com/microsoft/vscode-extension-samples/blob/master/tree-view-sample
*/

export class SoundItem extends vscode.TreeItem {
    constructor(
        public readonly root: string
        , public readonly type: ('virt' | 'dir' | 'file')
        , public readonly position: number
        , public readonly fileName: string
        , public readonly filePath: string
        , public readonly prettyName: string
        , public readonly collapsibleState: vscode.TreeItemCollapsibleState
        , public readonly contextValue?: string
    ){
        super(
            prettyName
            , collapsibleState
        );
        this.tooltip = filePath;

        if(type === 'file'){
            const dirName = path.basename(path.dirname(filePath));
            this.label = `${dirName}:${position} / ${prettyName}`;
            this.tooltip = path.join(dirName, fileName);
        }

        this.resourceUri = vscode.Uri.file(filePath);
        this.contextValue = contextValue;
        this.id = root+":"+this.resourceUri;
    }
}

export class SoundBrowserSoundsView implements vscode.TreeDataProvider<SoundItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<SoundItem | undefined> = new vscode.EventEmitter<SoundItem | undefined>();
	readonly onDidChangeTreeData: vscode.Event<SoundItem | undefined> = this._onDidChangeTreeData.event;

    constructor(
        private config: Config
    ){}

    refresh(): void {
		this._onDidChangeTreeData.fire();
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
                return this.getVirtEntries(element.root, element.filePath);
            }
            else if (element.type === 'virt') {
                return this.getVirtEntries(element.root, element.fileName);
            }
            return Promise.resolve([]);
        }
        
        const dpaths = this.config.getDirtSamplesDirectories();

        let entries: Promise<SoundItem[]>;
    
        if(dpaths.length === 1){
            entries = this.getVirtEntries(dpaths[0], dpaths[0]);
        }
        else {
            entries = Promise.resolve(dpaths.map((x, i) =>
                new SoundItem(
                    x
                    , 'virt'
                    , i
                    , x
                    , x
                    , x
                    , vscode.TreeItemCollapsibleState.Expanded
                )
            ));
        }

        return entries;
    }

    private async getVirtEntries(root: string, vpath: string): Promise<SoundItem[]> {
        if(vpath.toLowerCase() === ':superdirt'){
            vscode.window.showErrorMessage("Fetching sample information from SuperDirt is currently not supported");
            return [];
        }
        if(!this.pathExists(vpath)){
            vscode.window.showErrorMessage(`The path you defined for loading dirt smaple infos does not exist: ${vpath}`);
            return [];
        }

        return new Promise<SoundItem[]>((resolve, reject) => {
            fs.readdir(vpath, (err, files) => {
                if(err){
                    reject(err);
                    return;
                }
                resolve(
                    files
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
                                vpath
                                , isDir ? 'dir' : 'file'
                                , i
                                , fn
                                , path.join(vpath, fn)
                                , fn.replace(/^(\s|\d)*[_]+\s*/i,'').replace(/\.[^.]+$/i,'')
                                , isDir ?
                                    vscode.TreeItemCollapsibleState.Collapsed
                                    : vscode.TreeItemCollapsibleState.None
                                , isDir ? undefined : 'wav'
                            );
                    })
                );
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
