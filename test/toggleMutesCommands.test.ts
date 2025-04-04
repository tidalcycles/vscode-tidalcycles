import * as toggleMutes from './../src/toggleMutesCommands';
import * as sinon from 'sinon';
import * as repl from './../src/repl';
import * as vscode from 'vscode';

describe('toggleMutesCommands', () => {
  const sandbox = sinon.createSandbox();

  it('should mute d1', () => {
    sandbox.mock(vscode.workspace);
    const replSpy = sandbox.stub(repl, 'send');
    const spy = sandbox.spy(toggleMutes, 'toggleMute');

    toggleMutes.toggleMute1();

    sinon.assert.calledOnce(spy);
    sinon.assert.calledWith(spy, '1');
    sinon.assert.calledOnce(replSpy);
    sinon.assert.calledWith(replSpy, 'mute 1');
  });
});
