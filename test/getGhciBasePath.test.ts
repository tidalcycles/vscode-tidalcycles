// @ts-expect-error its ok
import mock = require('mock-require');

mock('vscode', {
  workspace: {},
  window: {},
});

import * as vscode from 'vscode';
import * as os from 'os';
import { assert } from 'chai';
import * as sinon from 'sinon';
import * as config from './../src/config';
import { getGhciBasePath } from './../src/getGhciBasePath';
import * as logger from './../src/logger';

describe('getGhciBasePath', () => {
  const sandbox = sinon.createSandbox();

  beforeEach(() => {
    sandbox.stub(os, 'homedir').returns('/Users/hank');
    sandbox.mock(vscode.window);
    sandbox.mock(vscode.workspace);
  });

  afterEach(() => {
    sandbox.restore();
  });

  it('should return .ghcup default path if no path is configured', () => {
    sandbox.stub(config, 'ghciPath').returns('');
    const actual = getGhciBasePath();
    assert.equal('/Users/hank/.ghcup/bin', actual);
  });

  it('should return configured path', () => {
    sandbox.stub(logger, 'info');
    sandbox.stub(config, 'ghciPath').returns('/path/to/my/stuff');

    const actual = getGhciBasePath();
    assert.equal('/path/to/my/stuff', actual);
  });

  it('should remove "ghci" from end of configured path', () => {
    sandbox.stub(logger, 'info');
    sandbox.stub(config, 'ghciPath').returns('/path/to/my/stuff/ghci');

    const actual = getGhciBasePath();
    assert.equal('/path/to/my/stuff/', actual);
  });
});
