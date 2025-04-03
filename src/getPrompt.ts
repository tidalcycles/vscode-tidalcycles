import { consolePrompt } from './config';
import { getDifference, getEvaluationCount, getTimestamp } from './status';

export const getPrompt = () => {
  return `${consolePrompt()
    .replace('%ec', getEvaluationCount().toString())
    .replace('%ts', getTimestamp().toString())
    .replace(
      '%diff',
      `${getDifference() > 0 ? '+' : ''}${getDifference().toString()}`
    )}> `;
};
