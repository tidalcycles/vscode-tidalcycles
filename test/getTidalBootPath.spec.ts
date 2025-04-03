import mock = require('mock-require');

mock('vscode', {
    workspace: {
      workspaceFolders: [{}]
    },
    window: {},
});

import * as config from './../src/config';
import * as vscode from 'vscode';
import { assert } from 'chai';
import * as sinon from 'sinon';
import { getTidalBootPath } from '../src/getTidalBootPath';
import * as logger from './../src/logger';
import * as fs from 'fs';
import * as ghci from '../src/getGhciBasePath';
import * as child_process from 'child_process';

describe('getTidalBootPath', () => {
    const sandbox = sinon.createSandbox();

    beforeEach(() => {
        sandbox.stub(logger, 'writeLine');
        sandbox.mock(vscode.workspace);
    });

    afterEach(() => {
        sandbox.restore();
    });

    it('should get configured boot path', () => {
        sandbox.stub(config, 'bootTidalPath').returns('/mah/boot/file.hs');

        const actual = getTidalBootPath();
        assert.equal('/mah/boot/file.hs', actual);
    });

    it('should get BootTidal.hs file in workspace root, if it exists', () => {

      // @ts-expect-error its ok
      sandbox.stub(fs, 'statSync').returns({});
      sandbox.stub(config, 'bootTidalPath').returns(null);
      sandbox.stub(vscode.workspace, 'workspaceFolders').value([{
        uri: {
          fsPath: '/mah/workspace'
        }
      }])

      const actual = getTidalBootPath();
      assert.equal('/mah/workspace/BootTidal.hs', actual);


    });

    it('should get BootTidal.hs file in Tidal package directory, by default', () => {
      sandbox.stub(fs, 'statSync').throws(new Error('not found'));
      sandbox.stub(config, 'bootTidalPath').returns(null);
      sandbox.stub(vscode.workspace, 'workspaceFolders').value([])
      sandbox.stub(ghci, 'getGhciBasePath').returns('/Users/hank/.ghcup/bin')
      sandbox.stub(child_process, 'execSync').returns('/Users/hank/.cabal')

      const actual = getTidalBootPath();
      assert.equal('/Users/hank/.cabal/BootTidal.hs', actual);
    })
});
