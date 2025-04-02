import * as os from 'os';
import * as path from 'path';

export const getGhciBasePath = () => {
  return path.join(os.homedir(), ".ghcup", "bin")
};