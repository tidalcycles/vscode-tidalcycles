import { send } from "./repl";
import { getExpressionUnderCursor } from "./getExpressionUnderCursor";

export const evalCommand = () => {
  const input = getExpressionUnderCursor(false);
  if (!input) {
    return;
  }
  send(input);
}

export const evalMultiCommand =  () => {
  const input = getExpressionUnderCursor(true);
  if (!input) {
      return;
  }
  send(input);
};

export const hushCommand = () => {
  send('hush');
}