import Zepr = require('zepr.ts');

import { GridSprite } from './view';
import { Export, StoreData } from './export';

interface Pattern {
    name: string;
    store: string;
    ruleset: string;
    desc: string;
}

interface Patterns {
    lastUpdate: string;
    data: Array<Pattern>;
}


class TextSprite extends Zepr.RawSprite<Zepr.Rectangle> {

    /** Canvas used for off-screen rendering (double buffering) */
    private offCanvas: HTMLCanvasElement;
    /** off-screen Canvas rendering context */
    private offCtx: CanvasRenderingContext2D;
    
    /** Text content */
    private text: string;

    private border: boolean;

    public constructor(text: string, position: Zepr.Rectangle, private font: Zepr.Font, private align: Zepr.TextAlign, border?: boolean) {
        super(position);

        this.offCanvas = document.createElement<'canvas'>('canvas');
        this.offCanvas.width = position.width;
        this.offCanvas.height = position.height;
        this.offCtx = this.offCanvas.getContext('2d');

        this.border = border;

        if (text != null) {
            this.setText(text);
        }
    }

    /**
     * Defines new content for text sprite
     * @param text Text to show
     * @param reverse If sets, use video-inverse. Defines color for foreground
     */
    public setText(text: string, reverse?: string) {
        this.text = text;

        if (text == null) {
            this.offCtx.clearRect(0, 0, this.shape.width, this.shape.height);
            return;
        }

        let zText: Zepr.Text;
        if (reverse == null) {
            this.offCtx.clearRect(0, 0, this.shape.width, this.shape.height);

            if (this.border) {
                this.offCtx.strokeStyle = this.font.color;
                this.offCtx.strokeRect(0, 0, this.shape.width, this.shape.height);
            }

            zText = new Zepr.Text(text, new Zepr.Point(10, 0), this.shape.width - 20, this.font, this.align);
        } else {
            this.offCtx.fillStyle = this.font.color;
            this.offCtx.fillRect(0, 0, this.shape.width, this.shape.height);
            zText = new Zepr.Text(text, new Zepr.Point(10, 0), this.shape.width - 20, new Zepr.Font(this.font.face, this.font.size, reverse), this.align);
        }
        
        zText.render(this.offCtx);
    }

    public getText(): string {
        return this.text;
    }

    public render(context: CanvasRenderingContext2D): void {
        context.drawImage(this.offCanvas, this.shape.x - this.shape.width / 2, this.shape.y - this.shape.height / 2);
    }

}



export class LoadScreen implements Zepr.GameScreen, Zepr.ClickListener {

    private patterns: Patterns;

    /** Default font */
    private font: Zepr.Font;
    /** First displayed menu item */
    private menuIndex: number;

    /** Abort control */
    private controlAbort: TextSprite;
    /** Validate control */
    private controlValidate: TextSprite;

    /** Displayed items */
    private items: Array<TextSprite>;
    /** Ruleset */
    private ruleset: TextSprite;
    /** Description */
    private desc: TextSprite;
    /** Selected item */
    private select: string;

    /** Loading */
    private loading: boolean;

    constructor() {
        this.font = new Zepr.Font('Arial', 14, GridSprite.COLORS[1]);
        this.menuIndex = 0;

        // Create controls
        this.controlAbort = new TextSprite('X', new Zepr.Rectangle(472, 18, 36, 18), this.font, Zepr.TextAlign.CENTER, true)
        this.controlValidate = new TextSprite('OK', new Zepr.Rectangle(472, 478, 56, 18), this.font, Zepr.TextAlign.CENTER, true)

        // Create items
        this.items = new Array<TextSprite>();
        for (let i = 0; i < 9; i++) {
            this.items.push(new TextSprite(null, new Zepr.Rectangle(256, 70 + i * 20, 472, 20), this.font, Zepr.TextAlign.LEFT));
        }

        Zepr.Net.get('patterns.json', (message: any): void => {
            this.patterns = <Patterns>message;
        });

        this.ruleset = new TextSprite(null, new Zepr.Rectangle(256, 266, 412, 31), this.font, Zepr.TextAlign.JUSTIFY);
        this.desc = new TextSprite(null, new Zepr.Rectangle(256, 370, 412, 157), this.font, Zepr.TextAlign.JUSTIFY);
    }

    // TODO : Controle que les patterns sont chargés

    init(engine: Zepr.Engine): void {
        engine.setBackgroundColor('#ffffff');
        engine.enableMouseControl(true);

        // Header
        engine.addSprite(new TextSprite('>>> SELECTION <<<', new Zepr.Rectangle(256, 19, 312, 20), this.font, Zepr.TextAlign.CENTER));

        // Controls
        engine.addSprite(this.controlAbort);
        engine.addSprite(this.controlValidate);

        // Register menu items
        this.items.forEach((ts: TextSprite): void => {
            engine.addSprite(ts);
        });

        // Description
        engine.addSprite(this.ruleset);
        engine.addSprite(this.desc);

        this.updateItems();
    }

    private updateItems(): void {
        let text: string = null;
        this.items.forEach((ts: TextSprite, idx: number): void => {
            if (idx + this.menuIndex < this.patterns.data.length) {
                text = this.patterns.data[idx + this.menuIndex].name;
                ts.setText(text, text == this.select ? '#ffffff' : null);
            } else {
                ts.setText(null);
            }
        });

        if (this.select == null) {
            this.ruleset.setText(null);
            this.desc.setText(null);
        } else {
            this.patterns.data.some((p: Pattern): boolean => {
                if (p.name == this.select) {
                    this.ruleset.setText(p.ruleset);
                    this.desc.setText(p.desc);
                    return true;
                }
                return false;
            })

        }
    }

    run(engine: Zepr.Engine): void {
    }

    onClick(engine: Zepr.Engine, point: Zepr.Point, sprites: Zepr.RawSprite<any>[]): void {

        if (this.loading) return; // No action if loading

        if (sprites && sprites.length > 0 && sprites[0] instanceof TextSprite) {
            // Check controls
            if (sprites[0] == this.controlAbort) {
                // Back to main screen
                engine.start('main');
                return;
            } 

            if (sprites[0] == this.controlValidate && this.select) {
                // Search for file to load
                let pattern: Pattern = null;
                this.patterns.data.some((p: Pattern): boolean => {
                    if (p.name == this.select) {
                        pattern = p;
                        return true;
                    }
                    return false;
                });
    
                if (pattern) {
                    this.loading = true;
                    Zepr.Net.get('patterns/' + pattern.store + '.json', (message: any): void => {
                        Export.storeData = <StoreData>message;
                        this.loading = false;
                        engine.start('main');
                    });
                }
            }

            // Check items        
            let idx: number = this.items.indexOf(<TextSprite>sprites[0]);
            if (idx >= 0) {
                this.select = this.items[idx].getText();
            }
        }

        this.updateItems();
    }

    /*
    drawLoadSaveMenu(): void {
        this.offCtx.clearRect(0, 0, 512, 512);

        this.offCtx.strokeStyle = GridSprite.COLORS[1];

        // Draw border
        this.offCtx.beginPath();
        this.offCtx.moveTo(5, 497);
        this.offCtx.lineTo(5, 29);
        this.offCtx.lineTo(5 + 158 * this.menuIndex, 29);
        this.offCtx.lineTo(5 + 158 * this.menuIndex, 5);
        this.offCtx.lineTo(5 + 158 * (this.menuIndex + 1), 5);
        this.offCtx.lineTo(5 + 158 * (this.menuIndex + 1), 29);
        this.offCtx.lineTo(497, 29);
        this.offCtx.lineTo(497, 497);
        this.offCtx.closePath();
        this.offCtx.lineJoin = 'round';
        this.offCtx.stroke();

        // Menu items
        new Zepr.Text('Load', new Zepr.Point(15, 9), 128, this.font, Zepr.TextAlign.CENTER).render(this.offCtx);
        new Zepr.Text('Save', new Zepr.Point(173, 9), 128, this.font, Zepr.TextAlign.CENTER).render(this.offCtx);
        new Zepr.Text('Clear', new Zepr.Point(331, 9), 128, this.font, Zepr.TextAlign.CENTER).render(this.offCtx);
        new Zepr.Text('X', new Zepr.Point(474, 9), 28, this.font, Zepr.TextAlign.CENTER).render(this.offCtx);
    }*/

}
