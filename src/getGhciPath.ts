import * as os from 'os';
import * as path from 'path';
// const path = '/Users/kindohm/.ghcup/bin/ghci';

export const getGhciBasePath = () => {
  return path.join(os.homedir(), ".ghcup", "bin")
};