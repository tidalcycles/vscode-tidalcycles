let evaluationCount = 0;
let lastCommand = '';
let difference = 0;

export const updateStatus = (command: string) => {
  evaluationCount++;
  difference = command.length - lastCommand.length;
  lastCommand = command;
};

export const getDifference = () => difference;
export const getEvaluationCount = () => evaluationCount;
export const getTimestamp = () => Math.round(Date.now() / 1000);
