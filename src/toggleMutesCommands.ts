import { send } from './repl';

const mutesState: Record<string, boolean> = {};

const toggleMute = (connection: string) => {
  const command = mutesState[connection]
    ? `unmute ${connection}`
    : `mute ${connection}`;

  mutesState[connection] = !mutesState[connection];

  send(command);
};

export const toggleMute1 = () => toggleMute('1');
export const toggleMute2 = () => toggleMute('2');
export const toggleMute3 = () => toggleMute('3');
export const toggleMute4 = () => toggleMute('4');
export const toggleMute5 = () => toggleMute('5');
export const toggleMute6 = () => toggleMute('6');
export const toggleMute7 = () => toggleMute('7');
export const toggleMute8 = () => toggleMute('8');
export const toggleMute9 = () => toggleMute('9');
export const toggleMute10 = () => toggleMute('10');
export const toggleMute11 = () => toggleMute('11');
export const toggleMute12 = () => toggleMute('12');
export const toggleMute13 = () => toggleMute('13');
export const toggleMute14 = () => toggleMute('14');
export const toggleMute15 = () => toggleMute('15');
export const toggleMute16 = () => toggleMute('16');
