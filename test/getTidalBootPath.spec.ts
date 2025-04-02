import mock = require('mock-require');

mock('vscode', {
    workspace: {},
    window: {},
});

import * as config from './../src/config';
import * as vscode from 'vscode';
import { assert } from 'chai';
import * as sinon from 'sinon';
import { getTidalBootPath } from '../src/getTidalBootPath';
import * as logger from './../src/logger';

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
});
