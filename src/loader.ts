import Zepr = require('zepr.ts');

/**
 * Customized loader screen
 */
export class CellaLoaderScreen implements Zepr.LoaderScreen {
    
    private loaderSprite: LoaderSprite;
    
    init(engine: Zepr.Engine): void {
        this.loaderSprite = new LoaderSprite();

        engine.setBackgroundColor('#FFFFFF');
        engine.addSprite(this.loaderSprite);
    }    
    
    run(engine: Zepr.Engine, stats: Zepr.LoaderStats): void {
        this.loaderSprite.update(stats);
    }
}

class LoaderSprite extends Zepr.RawSprite<Zepr.Rectangle> {

    private static readonly PATTERNS: Array<Array<Array<boolean>>> =
    [
        [[false, true, true], [true, true, false], [false, false, true]],
        [[true, true, true], [true, false, false], [false, true, false]],
        [[false, true, false], [true, true, false], [true, false, true]],
        [[true, true, false], [true, false, true], [true, false, false]]
    ];

    private static readonly COLOR_COMPLETE = '#c02942';

    private static readonly COLOR_EMPTY = '#d0d0d0';

    private canvasPatterns: Array<Array<HTMLCanvasElement>>;

    /** Completion ratio */
    private progress: number;
    /** Frame switch index (Every 10 refresh) */
    private switchFrame: number;
    /** Current frame */
    private canvasIndex;

    public constructor() {
        super(new Zepr.Rectangle(128, 128, 256, 256));

        // Generate patterns
        this.canvasPatterns = new Array<Array<HTMLCanvasElement>>();
        LoaderSprite.PATTERNS.forEach((p: Array<Array<boolean>>): void => {
            let newPattern: Array<HTMLCanvasElement> = new Array<HTMLCanvasElement>();
            newPattern.push(this.getCanvas(p, LoaderSprite.COLOR_EMPTY));
            newPattern.push(this.getCanvas(p, LoaderSprite.COLOR_COMPLETE));

            this.canvasPatterns.push(newPattern);
        });

        // Init
        this.progress = 0;
        this.switchFrame = 0;
        this.canvasIndex = 0;
    }

    update(stats: Zepr.LoaderStats) {
        this.progress = stats.loaded / stats.total;
        this.switchFrame++;
        if (this.switchFrame > 10) {
            this.switchFrame = 0;
            this.canvasIndex = (this.canvasIndex + 1) % this.canvasPatterns.length;
        }
    }

    render(context: CanvasRenderingContext2D): void {
        context.drawImage(this.canvasPatterns[this.canvasIndex][0], this.shape.x, this.shape.y);
        let height: number = this.shape.height * this.progress;
        if (height > 0) {
            context.save();

            context.beginPath();
            context.rect(this.shape.x, this.shape.y + this.shape.height - height, this.shape.width, height);
            context.clip();
            context.drawImage(this.canvasPatterns[this.canvasIndex][1], this.shape.x, this.shape.y);
            
            context.restore();
        }
    }

    private getCanvas(grid: Array<Array<boolean>>, color: string): HTMLCanvasElement {
        let canvas: HTMLCanvasElement = document.createElement<'canvas'>('canvas');
        canvas.width = 256;
        canvas.height = 256;

        let context: CanvasRenderingContext2D = canvas.getContext('2d');
        context.fillStyle = color;

        for (let i = 0; i < 3; i++) {
            for (let j = 0; j < 3; j++) {
                if (grid[i][j]) {
                    context.beginPath();
                    context.arc(42.5 + 85 * i, 42.5 + 85 * j, 36, 0, 2 * Math.PI, false);
                    context.fill();
                }
            }
        }

        // Add text
        let loading: Zepr.Text = new Zepr.Text(
            'Chargement...', new Zepr.Point(0, 120), 256, 
            new Zepr.Font('arial', 16, '#000000'), Zepr.TextAlign.CENTER
        );
        loading.render(context);

        return canvas;
    }
}