import { send } from './repl';

const mutesState: Record<string, boolean> = {};

const toggleMute = (connection: string) => {
  const command = mutesState[connection]
    ? `unmute ${connection}`
    : `mute ${connection}`;

  send(command);
};

export const toggleMute1 = () => toggleMute('d1');
export const toggleMute2 = () => toggleMute('d2');
export const toggleMute3 = () => toggleMute('d3');
export const toggleMute4 = () => toggleMute('d4');
export const toggleMute5 = () => toggleMute('d5');
export const toggleMute6 = () => toggleMute('d6');
export const toggleMute7 = () => toggleMute('d7');
export const toggleMute8 = () => toggleMute('d8');
export const toggleMute9 = () => toggleMute('d9');
export const toggleMute10 = () => toggleMute('d10');
export const toggleMute11 = () => toggleMute('d11');
export const toggleMute12 = () => toggleMute('d12');
export const toggleMute13 = () => toggleMute('d13');
export const toggleMute14 = () => toggleMute('d14');
export const toggleMute15 = () => toggleMute('d15');
export const toggleMute16 = () => toggleMute('d16');
