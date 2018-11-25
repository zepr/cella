import Zepr = require('zepr.ts');




export class ColorPickerSprite extends Zepr.RawSprite<Zepr.Rectangle> {

    /** Canvas used for off-screen rendering (double buffering) */
    private offCanvas: HTMLCanvasElement;
    /** off-screen Canvas rendering context */
    private offCtx: CanvasRenderingContext2D;

    constructor(protected nbColors: number) {
        super(new Zepr.Rectangle(0, 0, 98, 98), 1);

        this.offCanvas = document.createElement<'canvas'>('canvas');
        this.offCanvas.width = 512;
        this.offCanvas.height = 512;
        this.offCtx = this.offCanvas.getContext('2d');

        this.update();
    }

    setColors(newValue: number): void {
        this.nbColors = newValue;
        this.update();
    }

    update(): void {

        // Background
        this.offCtx.fillStyle = 'white';
        this.offCtx.fillRect(0, 0, 98, 98);

        // Colors
        let px: number = 4;
        let py: number = 4;

        for (let i: number = 0; i < 9; i++) { // TODO: pour tests
            
            if (i > 0) {
                if (i <= this.nbColors) {
                    this.offCtx.fillStyle = GridSprite.COLORS[i];
                    this.offCtx.fillRect(px, py, 30, 30);
                } else {
                    this.offCtx.strokeStyle = GridSprite.COLORS[i];
                    this.offCtx.lineWidth=8;
                    this.offCtx.beginPath();
                    this.offCtx.moveTo(px + 6, py + 6);
                    this.offCtx.lineTo(px + 24, py + 24);
                    this.offCtx.stroke();
                    this.offCtx.moveTo(px + 6, py + 24);
                    this.offCtx.lineTo(px + 24, py + 6);
                    this.offCtx.stroke();
                }
            }

            px += 30; 
            if (px >= 90) {
                px = 4;
                py += 30;
            }
        }

        // Border
        this.offCtx.strokeStyle='#C02942';
        this.offCtx.lineWidth=4;
        this.offCtx.strokeRect(2, 2, 94, 94);
    }



    render(context: CanvasRenderingContext2D): void {
        context.drawImage(this.offCanvas, this.shape.x, this.shape.y);
    }
}


export class MenuSprite extends Zepr.RawSprite<Zepr.Rectangle> {

    /** Continuous generation */
    private loop: boolean;
    /** Single generation */
    private run: boolean;

    constructor(protected menuImage: HTMLImageElement, 
        protected menuPause: HTMLImageElement, 
        protected menuGen: HTMLImageElement,
        protected color: number) {
        
        super(new Zepr.Rectangle(416, 136, 48, 240), 1);
    }

    render(context: CanvasRenderingContext2D): void {
        context.drawImage(this.menuImage, this.shape.x, this.shape.y);
        if (this.loop) {
            context.drawImage(this.menuPause, this.shape.x, this.shape.y);
        }
        if (this.run) {
            context.drawImage(this.menuGen, this.shape.x, this.shape.y + 48);
        }

        // Color
        context.beginPath();
        context.arc(this.shape.x + 35, this.shape.y + 131, 6, 0, 2*Math.PI);
        if (this.color) {
            context.fillStyle = GridSprite.COLORS[this.color];
            context.fill();
        } else {
            context.strokeStyle = '#000000';
            context.stroke();
        }
    }

    setColor(color: number): void {
        this.color = color;
    }

    setLooping(isLooping: boolean): void {
        this.loop = isLooping;
    }

    setRunning(isRunning: boolean): void {
        this.run = isRunning;
        if (this.run && this.loop) this.loop = false;
    }

    isRunning(): boolean {
        return this.run || this.loop;
    }
}


export class GridSprite extends Zepr.RawSprite<Zepr.Rectangle> {

    public static readonly COLORS: Array<string> = [
        null, // No value for first index (empty)
        '#53777a', '#542437', '#c02942', '#d95b43', 
        '#ecd078', '#b5e86f', '#d827b5', '#1c9cce'
    ];

    private zoom: number;
    private nextZoom: number;
    private origin: Zepr.Vector;

    private nextGrid: Array<Array<number>>;

    /** Canvas used for off-screen rendering (double buffering) */
    private offCanvas: HTMLCanvasElement;
    /** off-screen Canvas rendering context */
    private offCtx: CanvasRenderingContext2D;

    private needUpdate: boolean;


    constructor(private grid: Array<Array<number>>) {
        super(new Zepr.Rectangle(0, 0, 512, 512), 0);
        this.zoom = 1;
        this.nextZoom = 1;
        this.origin = new Zepr.Vector();

        this.offCanvas = document.createElement<'canvas'>('canvas');
        this.offCanvas.width = 512;
        this.offCanvas.height = 512;
        this.offCtx = this.offCanvas.getContext('2d'); 
        
        this.needUpdate = true;
    }

    public getZoom = (): number => {
        return this.zoom;
    }

    public setZoom = (newZoom: number): void => {
        this.nextZoom = newZoom;
        this.needUpdate = true;
    }

    public getOrigin = (): Zepr.Vector => {
        return new Zepr.Vector(this.origin.x, this.origin.y);
    }

    public reset = (x: number, y: number, z: number): void => {
        this.origin.set(x, y);
        this.zoom = z;
        this.nextZoom = z;
        this.needUpdate = true;
    }

    public setGrid = (newGrid: Array<Array<number>>): void => {
        this.nextGrid = newGrid;
        this.needUpdate = true;
    }

    /**
     * Return the cell index of a point on screen
     */
    public getPosition = (point: Zepr.Point): Array<number> => {
        let x: number = this.normalize(Math.floor((point.x - this.origin.x) / this.zoom));
        let y: number = this.normalize(Math.floor((point.y - this.origin.y) / this.zoom));

        return <Array<number>>[x, y];
    }

    /**
     * Normalize value for looping [0 - 511] index
     */
    public normalize = (idx: number): number => {
        idx %= 512;
        if (idx < 0) idx += 512;
        return idx;
    }

    public drag = (delta: Zepr.Vector): void => {
        this.origin.add(delta);
        this.needUpdate = true;
    }

    public updateView = (): void => {
        this.needUpdate = true;
    }

    render(context: CanvasRenderingContext2D): void {

        if (this.nextZoom != this.zoom) {
            let delta: number = (this.zoom - this.nextZoom) / this.zoom;
            this.zoom = this.nextZoom;
            this.drag(new Zepr.Vector((256 - this.origin.x) * delta, (256 - this.origin.y) * delta));
        }

        // Dots
        if (this.nextGrid) {
            this.grid = this.nextGrid;
            this.nextGrid = null;
        }

        if (this.needUpdate) {
            this.repaint(this.offCtx);
            this.needUpdate = false;
        }

        context.drawImage(this.offCanvas, 0, 0);
    }

    repaint(context: CanvasRenderingContext2D): void {

        context.clearRect(0, 0, 512, 512);        

        // DRAW CELLS

        // Viewable dots
        let minX: number = Math.floor(-this.origin.x / this.zoom);
        let minY: number = Math.floor(-this.origin.y / this.zoom);
        let dim: number = Math.ceil(512 / this.zoom);

        // Start point (gfx)
        let startX: number = this.origin.x + minX * this.zoom;
        let startY: number = this.origin.y + minY * this.zoom;

        // Current position (gfx)
        let currentX: number;
        let currentY: number = startY;

        // Start point (cell coords)
        let firstCellX: number = this.normalize(minX);
        let y: number = this.normalize(minY);
        let x: number;

        for (let j: number = 0; j <= dim; j++) {           

            currentX = startX;
            x = firstCellX;

            for (let i: number = 0; i <= dim; i++) {

                if (this.grid[x][y] > 0) {
                    context.fillStyle = GridSprite.COLORS[this.grid[x][y]];
                    //context.fillStyle = GridSprite.COLORS[((x + y) % 8) + 1];
                    context.fillRect(currentX, currentY, this.zoom, this.zoom);
                }
                currentX += this.zoom;
                x++;
                if (x == 512) x = 0;
            }
            currentY += this.zoom;
            y++;
            if (y == 512) y = 0;
        }

        // DRAW GRID
        // Grid
        if (this.zoom > 4) {
            if (this.zoom > 8) {
                context.strokeStyle = '#888';
            } else { // Between 4 and 8
                let value = Math.floor(128 + 32 * (8 - this.zoom)).toString(16);
                context.strokeStyle = '#' + value + value + value;
            }

            currentX = startX;
            currentY = startY;
            for (let i = 0; i <= dim; i++) {
                context.beginPath();
                context.moveTo(0, currentY);
                context.lineTo(512, currentY);
                context.stroke();

                context.beginPath();
                context.moveTo(currentX, 0);
                context.lineTo(currentX, 512);
                context.stroke();

                currentX += this.zoom;
                currentY += this.zoom;
            }
        }        
    }
}