import { send } from './repl';
import { getExpressionUnderCursor } from './getExpressionUnderCursor';
import { evaluate } from './status';

export const evalCommand = () => {
  const input = getExpressionUnderCursor(false);
  if (!input) {
    return;
  }
  evaluate(input);
  send(input);
};

export const evalMultiCommand = () => {
  const input = getExpressionUnderCursor(true);
  if (!input) {
    return;
  }
  evaluate(input);
  send(input);
};

export const hushCommand = () => {
  evaluate('hush');
  send('hush');
};
