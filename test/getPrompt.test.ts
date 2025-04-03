import mock = require('mock-require');

mock('vscode', {
  workspace: {},
});

import { getPrompt } from './../src/getPrompt';
import * as status from './../src/status';
import { assert } from 'chai';
import * as sinon from 'sinon';
import * as config from './../src/config';

const sandbox = sinon.createSandbox();

describe('getPrompt', () => {
  beforeEach(() => {
    sandbox.restore();
  });

  it('should return configured prompt', () => {
    sandbox.stub(config, 'consolePrompt').returns('t');

    const actual = getPrompt();
    assert.equal(actual, 't> ');
  });

  it('should return configured prompt with eval count', () => {
    sandbox.stub(config, 'consolePrompt').returns('t %ec');
    sandbox.stub(status, 'getEvaluationCount').returns(100);

    const actual = getPrompt();
    assert.equal(actual, 't 100> ');
  });

  it('should return configured prompt with timestamp', () => {
    sandbox.stub(config, 'consolePrompt').returns('t %ts');
    sandbox.stub(status, 'getTimestamp').returns(293818);

    const actual = getPrompt();
    assert.equal(actual, 't 293818> ');
  });

  it('should return configured prompt with positive difference', () => {
    sandbox.stub(config, 'consolePrompt').returns('t %diff');
    sandbox.stub(status, 'getDifference').returns(10);

    const actual = getPrompt();
    assert.equal(actual, 't +10> ');
  });

  it('should return configured prompt with negative difference', () => {
    sandbox.stub(config, 'consolePrompt').returns('t %diff');
    sandbox.stub(status, 'getDifference').returns(-10);

    const actual = getPrompt();
    assert.equal(actual, 't -10> ');
  });

  it('should return configured prompt with all placeholders', () => {
    sandbox.stub(config, 'consolePrompt').returns('boop %ec %ts %diff');
    sandbox.stub(status, 'getDifference').returns(-10);
    sandbox.stub(status, 'getTimestamp').returns(9191);
    sandbox.stub(status, 'getEvaluationCount').returns(67);

    const actual = getPrompt();
    assert.equal(actual, 'boop 67 9191 -10> ');
  });
});
