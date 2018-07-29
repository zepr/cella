import * as Types from '../types';
import { Engine } from '../engine';

const ctx: Worker = self as any;

var engine: Engine;

var loop: boolean = false;

ctx.addEventListener('message', (event) => {

    let message = <Types.Message>event.data;

    switch (message.command) {
        case Types.WorkerCommand.Init:
            engine = new Engine(message.grid, message.rules);
        break;
        case Types.WorkerCommand.Start:
            engine.updateGrid(message.grid);
            loop = false;
            run();
        break;
        case Types.WorkerCommand.Stop:
            loop = false;
        break;
        case Types.WorkerCommand.Loop:
            engine.updateGrid(message.grid);
            loop = true;
            run();
        break;
        default:
            // Inconnu
    }
});

let run = (): void => {
    engine.next();
    ctx.postMessage(new Types.Message(Types.WorkerCommand.Update, engine.getGrid()));
    if (loop) {
        setTimeout(run, 0);
    }
}