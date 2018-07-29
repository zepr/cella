import Zepr = require('zepr.ts');



export class MenuSprite extends Zepr.Sprite {

    /** Continuous generation */
    private loop: boolean;
    /** Single generation */
    private run: boolean;

    constructor(protected menuImage: HTMLImageElement, protected menuPause: HTMLImageElement, protected menuGen: HTMLImageElement) {
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
        null, '#53777A', '#542437', '#C02942', '#D95B43', '#ECD078', '#B5E86F', '#D827B5', '#1C9CCE'
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
        return <Array<number>>[
            Math.floor((point.x - this.origin.x) / this.zoom),
            Math.floor((point.y - this.origin.y) / this.zoom)
        ];
    }

    public drag = (delta: Zepr.Vector): void => {
        this.origin.addVector(delta);

        // Enforce limits
        if (this.origin.x > 0) this.origin.set(0, this.origin.y);
        if (this.origin.y > 0) this.origin.set(this.origin.x, 0);
        let min: number = 512 * (1 - this.zoom);
        if (this.origin.x < min) this.origin.set(min, this.origin.y);
        if (this.origin.y < min) this.origin.set(this.origin.x, min);

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

        // Grid
        if (this.zoom > 4) {
            if (this.zoom > 8) {
                context.strokeStyle = '#888';
            } else { // Between 4 and 8
                let value = Math.floor(128 + 32 * (8 - this.zoom)).toString(16);
                context.strokeStyle = '#' + value + value + value;
            }

            for (let i = this.origin.y; i < 512; i += this.zoom) {
                context.beginPath();
                context.moveTo(this.origin.x, i);
                context.lineTo(512, i);
                context.stroke();
            }

            for (let i = this.origin.x; i < 512; i += this.zoom) {
                context.beginPath();
                context.moveTo(i, this.origin.y);
                context.lineTo(i, 512);
                context.stroke();
            }
        }
        

        // Viewable dots
        let minX: number = Math.floor(-this.origin.x / this.zoom);
        let maxX: number = Math.min(511, Math.ceil(minX + 512 / this.zoom));
        let minY: number = Math.floor(-this.origin.y / this.zoom);
        let maxY: number = Math.min(511, Math.ceil(minY + 512 / this.zoom));

        // Start point
        let startX: number = this.origin.x + minX * this.zoom;
        let startY: number = this.origin.y + minY * this.zoom;

        // Current position
        let currentX: number;
        let currentY: number = startY;

        for (let y: number = minY; y <= maxY; y++) {

            currentX = startX;

            for (let x: number = minX; x <= maxX; x++) {
                if (this.grid[x][y] > 0) {
                    context.fillStyle = GridSprite.COLORS[this.grid[x][y]];
                    //context.fillStyle = GridSprite.COLORS[((x + y) % 8) + 1];
                    context.fillRect(currentX, currentY, this.zoom, this.zoom);
                }
                currentX += this.zoom;
            }
            currentY += this.zoom;
        }
    }
}