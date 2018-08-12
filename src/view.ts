import Zepr = require('zepr.ts');



export class MenuSprite extends Zepr.Sprite {

    /** Continuous generation */
    private loop: boolean;
    /** Single generation */
    private run: boolean;

    constructor(protected menuImage: HTMLImageElement, 
        protected menuPause: HTMLImageElement, 
        protected menuGen: HTMLImageElement) {
        super(new Zepr.Rectangle(416, 136, 48, 240), 1);
    }

    render(context: CanvasRenderingContext2D): void {
        context.drawImage(this.menuImage, this.rect.x, this.rect.y);
        if (this.loop) {
            context.drawImage(this.menuPause, this.rect.x, this.rect.y);
        }
        if (this.run) {
            context.drawImage(this.menuGen, this.rect.x, this.rect.y + 48);
        }
    }

    setLooping(isLooping: boolean): void {
        this.loop = isLooping;
    }

    setRunning(isRunning: boolean): void {
        this.run = isRunning;
        if (this.run && this.loop) this.loop = false;
    }
}


export class GridSprite extends Zepr.Sprite {

    public static readonly COLORS: Array<string> = [
        null, // No value for first index (empty)
        '#53777A', '#542437', '#C02942', '#D95B43', 
        '#ECD078', '#B5E86F', '#D827B5', '#1C9CCE'
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

    public setZoom = (newZoom: number): void => {
        this.nextZoom = newZoom;
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
        this.origin.addVector(delta);
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