import { TidalExpression } from './editor';
import { ILogger } from './logging';
import { Config } from './config';

/**
 * Logs the history of a Tidal session.
 */
export interface IHistory {
    getEvalCount(): number;
    log(expression: TidalExpression): void;
}

export class History implements IHistory {
    private evalCount: number = 0;

    constructor(private logger: ILogger, private config: Config) {
    }

    public log(expression: TidalExpression): void {
        this.evalCount++;
        if (this.config.showEvalCount()) {
            this.logger.log(`Evals: ${this.evalCount} `, false);
        }

        this.logRandomMessage();
    }

    public getEvalCount(): number {
        return this.evalCount;
    }

    private logRandomMessage(){
        const messages = this.config.randomMessages();
        const prob = this.config.randomMessageProbability();
        const rand = Math.random()
        if (messages.length > 0 && rand < prob){
            const message = this.getRandomMessage(messages);
            this.logger.log(`${message} `, false)
        } else{
            console.log('info', {prob, rand, messages})
        }

    }

    private getRandomMessage(messages: string[]){
        const index = Math.floor(Math.random() * messages.length);
        return messages[index];
    }
}