import Zepr = require('zepr.ts');

import Worker = require('worker-loader!./worker/worker');
import Types = require('./types');

import { Engine } from './engine';
import { GridSprite, MenuSprite, ColorPickerSprite } from './view';
import { CellaLoaderScreen } from './loader';
import { LoadScreen } from './loadstore';

import { Export, StoreData } from './export';

class GridScreen implements Zepr.GameScreen, Zepr.ClickListener, Zepr.DragListener, Zepr.ZoomListener {

    public static readonly MAX_DISTANCE_MOVE = 5;

    images: Array<string> = [
        'images/menu.png', 'images/menu_pause.png', 
        'images/menu_gen.png', 'images/edit_mode.png'];

    private gridSprite: GridSprite;
    private menuSprite: MenuSprite;

    private grid: Array<Array<number>>;

    private worker: Worker;

    /** Looping through generations */
    private looping: boolean;

    private clickPosition: Zepr.Point;
    private clickSprites: Array<Zepr.Sprite<any>>;
    private clickMove: Zepr.Vector;
    private menuPosition: number;

    /** Timeout used for editor */
    private editTimout: number;
    private editMode: boolean;
    private editPosition: Zepr.Point;
    private editIcon: Zepr.ImageSprite;

    /** Current color used for edit mode */
    private color: number;
    /** Colors difined for current cellular automata */
    private colorsAvailable: number;

    /** Color picker instance */
    private colorPicker: ColorPickerSprite;
    /** Check if color picker is visible */
    private isColorPickerVisible: boolean;

    /** Rules */
    private rules: Array<string>;

    init(engine: Zepr.Engine): void {

        engine.setBackgroundColor('#ffffff');

        engine.enableMouseControl(true);
        engine.enableMouseDrag();
        engine.enableZoomControl(1, 40);
        
        this.looping = false;

        if (this.grid == null) { // First load

            this.grid = Engine.getEmptyGrid(512, 512);
            this.gridSprite = new GridSprite(this.grid);

            // Set default values
            engine.setZoom(6);
            this.colorsAvailable = 2;            
            this.rules = ['8PL<2V', '8PL>3V', '8VL=3P'];            
        
        } else if (Export.storeData) { // Load game

            // Rectangle coords in export refers to upper-left corner
            this.grid = Export.decodeGrid(Export.storeData.grid, 
                new Zepr.Rectangle(Export.storeData.gridX, Export.storeData.gridY, Export.storeData.gridWidth, Export.storeData.gridHeight));
            this.gridSprite.setGrid(this.grid);

            // Change origin and zoom
            this.gridSprite.reset(Export.storeData.x, Export.storeData.y, Export.storeData.zoom);
            engine.setZoom(Export.storeData.zoom);

            this.colorsAvailable = Export.storeData.colors;
            this.rules = Export.storeData.rules;

            Export.storeData = null; // Reset

        } else { // Back to screen (no modification)
            engine.setZoom(this.gridSprite.getZoom());
        }

        this.color = 1; // Default color

        engine.addSprite(this.gridSprite);

        this.colorPicker = new ColorPickerSprite(this.colorsAvailable);

        this.menuSprite = new MenuSprite(
            engine.getImage('images/menu.png'),
            engine.getImage('images/menu_pause.png'),
            engine.getImage('images/menu_gen.png'),
            this.color
        );
        engine.addSprite(this.menuSprite);

        this.editIcon = new Zepr.ImageSprite(
            engine.getImage('images/edit_mode.png'),
            Zepr.Rectangle.asRect(0, 0, 24, 24), 10
        );

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

        let message: Types.Message = new Types.Message(Types.WorkerCommand.Init, this.grid, this.rules, this.colorsAvailable);
        this.worker.postMessage(message);
    }

    run(engine: Zepr.Engine): void {

    }

    onClick(engine: Zepr.Engine, point: Zepr.Point, sprites: Array<Zepr.Sprite<any>>): boolean {

        // Check for click on colorPicker
        if (this.isColorPickerVisible) {
            sprites.some((sprite: Zepr.Sprite<any>): boolean => {
                if (sprite instanceof ColorPickerSprite) {
                    // Change color
                    let px: number = point.x - this.colorPicker.getX() + 45;
                    let py: number = point.y - this.colorPicker.getY() + 45;
                    if (px >= 0 && px < 90 && py >= 0 && py < 90) {
                        // Color selected
                        let newColor: number = Math.floor(py / 30) * 3 + Math.floor(px / 30);
                        if (newColor <= this.colorsAvailable) {
                            this.color = newColor;
                            this.menuSprite.setColor(newColor);
                        }
                    }

                    return true;
                }
            });

            return true;
        }

        if (this.clickPosition) return true; // Avoid failed double-click

        this.clickPosition = point;
        this.clickSprites = sprites;
        this.clickMove = new Zepr.Vector();

        // Check for click on menu
        this.menuPosition = -1;
        this.clickSprites.some((sprite: Zepr.Sprite<any>): boolean => {
            if (sprite instanceof MenuSprite) {
                this.menuPosition = Math.floor((this.clickPosition.y - sprite.getY() + 120) / 48);
                return true;
            } 
        });

        // Check for editMode
        if (this.menuPosition == -1 && !this.menuSprite.isRunning()) {
            this.editTimout = setTimeout(this.onEdit, 200, this, engine);
            this.editPosition = new Zepr.Point(point.x, point.y);
        }

        return true;
    }


    onEdit(scr: GridScreen, engine: Zepr.Engine): void {

        scr.editMode = true;
        let updatePosition: Array<number> = scr.gridSprite.getPosition(scr.editPosition);
        if (scr.grid[updatePosition[0]][updatePosition[1]] != scr.color) {
            scr.grid[updatePosition[0]][updatePosition[1]] = scr.color;
            scr.gridSprite.updateView();
        }

        // show edit mode icon
        engine.addSprite(scr.editIcon);
    }

    onZoom(engine: Zepr.Engine, ratio: number): void {

        if (this.editTimout) {
            clearTimeout(this.editTimout);
            this.editTimout = 0;
        }

        if (this.editMode) {
            this.editMode = false;
            engine.removeSprite(this.editIcon);
        }

        if (this.isColorPickerVisible) {
            engine.removeSprite(this.colorPicker);
            this.isColorPickerVisible = false;
        }

        this.gridSprite.setZoom(ratio);
    }

    onDrag(engine: Zepr.Engine, move: Zepr.Vector): void {

        if (this.isColorPickerVisible) {
            return;
        }

        if (this.editMode) {
            this.editPosition.add(move.x, move.y);
            let updatePosition: Array<number> = this.gridSprite.getPosition(this.editPosition);

            if (this.grid[updatePosition[0]][updatePosition[1]] != this.color) {
                // Update state
                this.grid[updatePosition[0]][updatePosition[1]] = this.color;
                this.gridSprite.updateView();
            }

        } else if (this.clickPosition) {
            this.clickMove.add(move);
            if (this.clickMove.getMagnitude() > GridScreen.MAX_DISTANCE_MOVE) {

                // Disable edit mode if not yet enabled
                if (this.editTimout) {
                    clearTimeout(this.editTimout);
                    this.editTimout = 0;
                }        

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

        if (this.isColorPickerVisible) {
            engine.removeSprite(this.colorPicker);
            this.isColorPickerVisible = false;
        }

        if (this.editTimout) {
            clearTimeout(this.editTimout);
            this.editTimout = 0;
        }

        if (this.editMode) {
            this.editMode = false;
            engine.removeSprite(this.editIcon);
        }

        if (this.clickPosition && this.menuPosition != -1) {
            // Click on menu
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
                    // Color selector
                    if (this.colorsAvailable == 1) {
                        this.color = 1 - this.color;
                        this.menuSprite.setColor(this.color);
                    } else {
                        // Set position of colorPicker
                        let y: number = Math.max(69, Math.min(443, this.menuSprite.getY()));
                        let x: number;     

                        if (this.menuSprite.getX() >= 256) {
                            // Show left
                            x = this.menuSprite.getX() - 83;
                        } else {
                            // Show right
                            x = this.menuSprite.getX() + 83;
                        }

                        this.colorPicker.moveTo(x, y);

                        engine.addSprite(this.colorPicker);
                        this.isColorPickerVisible = true;
                        this.menuPosition = -1;
                    }
                break;
                case 3:
                    // Load/Save

                    // Stop loop
                    if (this.looping) {
                        this.worker.postMessage(new Types.Message(Types.WorkerCommand.Stop));
                        this.menuSprite.setLooping(false);
                        this.looping = false;
                    }

                    // Call load screen
                    engine.start('load');
                break;
                case 4:
                    // Rule editor
                break;
                default:
                    // WTF?
            } 
        }

        this.clickPosition = null;
    }

    private export(): void {
        let exportData: any = new Object();

        // Grid
        let gridRect: Zepr.Rectangle = Export.getAreaOfInterest(this.grid);
        exportData.gridWidth = gridRect.width;
        exportData.gridHeight = gridRect.height;
        exportData.gridX = gridRect.x;
        exportData.gridY = gridRect.y;
        exportData.grid = Export.encodeGrid(this.grid, gridRect);
        
        // Rules
        exportData.colors = this.colorsAvailable;
        exportData.rules = this.rules;

        // Scene
        exportData.zoom = this.gridSprite.getZoom();
        let origin: Zepr.Vector = this.gridSprite.getOrigin();
        exportData.x = origin.x;
        exportData.y = origin.y;


        console.log(JSON.stringify(exportData));
    }

}


window.onload = () => {
    let engine = new Zepr.Engine(512, 512, new CellaLoaderScreen());
    engine.addScreen('main', new GridScreen());
    engine.addScreen('load', new LoadScreen());
    engine.start('main');
};
