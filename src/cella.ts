import Zepr = require('zepr.ts');

import Worker = require('worker-loader!./worker/worker');
import Types = require('./types');

import { Engine } from './engine';
import { GridSprite, MenuSprite } from './view';

class GridScreen implements Zepr.GameScreen, Zepr.ClickListener, Zepr.DragListener, Zepr.ZoomListener {

    public static readonly MAX_DISTANCE_MOVE = 5;

    private gridSprite: GridSprite;
    private menuSprite: MenuSprite;

    //private menuDrag: boolean;

    private grid: Array<Array<number>>;

    private worker: Worker;

    /** Looping through generations */
    private looping: boolean;


    private clickPosition: Zepr.Point;
    private clickSprites: Array<Zepr.Sprite>;
    private clickMove: Zepr.Vector;
    private menuPosition: number;
    private gridPosition: Array<number>;

    // TODO => Separer constructeur / init

    init(engine: Zepr.Engine): void {

        engine.setBackgroundColor('#FFFFFF');

        engine.enableMouseControl(true);
        engine.enableMouseDrag();
        engine.enableZoomControl(1, 40);
        
        this.grid = Engine.getEmptyGrid(512, 512);

        for (let x: number = 0; x < 512; x++) {
            for (let y: number = 0; y < 512; y++) {
                this.grid[x][y] = Math.random() > 0.8 ? 1 : 0;
            }
        }

        this.looping = false;

        this.gridSprite = new GridSprite(this.grid);
        engine.addSprite(this.gridSprite);

        this.menuSprite = new MenuSprite(
            engine.getImage('images/menu.png'),
            engine.getImage('images/menu_pause.png'),
            engine.getImage('images/menu_gen.png')
        );
        engine.addSprite(this.menuSprite);

        // Start worker
        if (this.worker == null) {
            this.worker = new Worker();
            this.worker.addEventListener('message', 
                (event: MessageEvent): void => {
                    let message = <Types.Message>event.data;
                    this.menuSprite.setRunning(false);
                    // Set both references to the same object
                    this.grid = message.grid;
                    this.gridSprite.setGrid(message.grid);
                }
            );
        }

        let rules: Array<string> = ['8AA<2V', '8AA>3V', '8VA=3A'];
        let message: Types.Message = new Types.Message(Types.WorkerCommand.Init, this.grid, rules);
        this.worker.postMessage(message);
    }

    run(engine: Zepr.Engine): void {

    }

    onClick(engine: Zepr.Engine, point: Zepr.Point, sprites: Array<Zepr.Sprite>): void {

        this.clickPosition = point;
        this.clickSprites = sprites;
        this.clickMove = new Zepr.Vector();

        // Check for click on menu
        this.menuPosition = -1;
        this.clickSprites.some((sprite: Zepr.Sprite): boolean => {
            if (sprite instanceof MenuSprite) {
                this.menuPosition = Math.floor((this.clickPosition.y - sprite.getY()) / 48);
                return true;
            }
        });

        if (this.menuPosition == -1) {
            // Click on grid
            this.gridPosition = this.gridSprite.getPosition(point);
        }
    }

    onZoom(engine: Zepr.Engine, ratio: number): void {
        this.gridSprite.setZoom(ratio);
    }

    onDrag(engine: Zepr.Engine, move: Zepr.Vector): void {
        if (this.clickPosition) {
            this.clickMove.addVector(move);
            if (this.clickMove.getMagnitude() > GridScreen.MAX_DISTANCE_MOVE) {
                // Drag
                if (this.menuPosition >= 0) {
                    this.menuSprite.move(this.clickMove.x, this.clickMove.y);
                } else {
                    this.gridSprite.drag(this.clickMove);
                }

                this.clickPosition = null;
            }
        } else {
            if (this.menuPosition >= 0) {
                this.menuSprite.move(move.x, move.y);
            } else {
                this.gridSprite.drag(move);
            }
        }
    }

    onDrop(engine: Zepr.Engine): void {

        if (this.clickPosition) {
            // Click
            if (this.menuPosition == -1) {
                // On grid
                if (!this.looping) {
                    // TODO : Temp
                    this.grid[this.gridPosition[0]][this.gridPosition[1]] = 1 - this.grid[this.gridPosition[0]][this.gridPosition[1]];
                    this.gridSprite.updateView();
                }
            } else {
                // On menu
                let message: Types.Message;
                switch (this.menuPosition) {
                    case 0:
                        // Start/stop loop
                        if (this.looping) {
                            message = new Types.Message(Types.WorkerCommand.Stop);
                        } else {
                            message = new Types.Message(Types.WorkerCommand.Loop, this.grid);
                        }
                        this.looping = !this.looping;
                        this.menuSprite.setLooping(this.looping);
                        this.worker.postMessage(message);
                    break;
                    case 1:
                        // Next gen
                        message = new Types.Message(Types.WorkerCommand.Start, this.grid);
                        this.looping = false;
                        this.menuSprite.setRunning(true);
                        this.worker.postMessage(message);
                    break;
                    case 2:
                        // Rule editor
                    break;
                    case 3:
                        // Load/Save
                    break;
                    case 4:
                        // Reload
                    break;
                    default:
                        // WTF?
                } 
            }
        }
    }
}


window.onload = () => {
    let engine = new Zepr.Engine(512, 512);
    engine.addScreen('main', new GridScreen());
    engine.start('main');
};
