export enum WorkerCommand {
    Init,
    Start,
    Stop,
    Loop,
    Update
}


// Message will be serialized
// Only public attributes
export class Message {
    constructor(public command: WorkerCommand,
        public grid?: Array<Array<number>>,
        public rules?: Array<string>) {
    }
}
