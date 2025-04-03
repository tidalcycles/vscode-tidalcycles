import { send } from './repl';
import { getExpressionUnderCursor } from './getExpressionUnderCursor';
import { updateStatus } from './status';

export const evalCommand = () => {
  const input = getExpressionUnderCursor(false);
  if (!input) {
    return;
  }
  updateStatus(input);
  send(input);
};

export const evalMultiCommand = () => {
  const input = getExpressionUnderCursor(true);
  if (!input) {
    return;
  }
  updateStatus(input);
  send(input);
};

export const hushCommand = () => {
  updateStatus('hush');
  send('hush');
};
