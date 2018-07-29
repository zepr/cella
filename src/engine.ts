import { Rule } from './rule';

export class Engine {

    private width: number;
    private height: number;

    private check: Array<Array<boolean>>;

    private rules: Array<Rule>;

    public constructor(private grid: Array<Array<number>>, rawRules: Array<string>) {

        this.rules = new Array<Rule>();
        rawRules.forEach((rule: string):void => {
            this.rules.push(new Rule(rule));
        });

        this.updateGrid(grid);
    }

    public static getEmptyGrid = (width: number, height: number): Array<Array<number>> => {
        let grid: Array<Array<number>> = new Array<Array<number>>();
        for (let i = 0; i < width; i++) {
            grid[i] = new Array<number>();
            for (let j = 0; j < height; j++) {
                grid[i][j] = 0;
            }
        }
        return grid;
    }

    public updateGrid = (newGrid: Array<Array<number>>): void => {

        this.grid = newGrid;

        this.width = newGrid.length;
        this.height = newGrid[0].length;
        
        this.check = Engine.getEmptyCheck(this. width, this.height);
        for (let i = 0; i < this.width; i++) {
            for (let j = 0; j < this.height; j++) {
                if (this.grid[i][j] > 0) {
                    this.updateCheck(i, j, this.check);
                }
            }
        }
    }

    private cloneGrid = (): Array<Array<number>> => {
        let clone: Array<Array<number>> = new Array<Array<number>>();
        for (let i = 0; i < this.width; i++) {
            clone[i] = new Array<number>();
            for (let j = 0; j < this.height; j++) {
                clone[i][j] = this.grid[i][j];
            }
        }

        return clone;
    }

    private static getEmptyCheck = (width: number, height: number): Array<Array<boolean>> => {
        let grid: Array<Array<boolean>> = new Array<Array<boolean>>();
        for (let i = 0; i < width; i++) {
            grid[i] = new Array<boolean>();
            for (let j = 0; j < height; j++) {
                grid[i][j] = false;
            }
        }
        return grid;
    }

    private updateCheck = (x: number, y: number, check: Array<Array<boolean>>): void => {
        for (let i = x - 1; i <= x + 1; i++) {
            for (let j = y - 1; j <= y + 1; j++) {
                this.updateCellCheck(i, j, check);
            }
        }
    }

    private updateCellCheck = (x: number, y: number, check: Array<Array<boolean>>): void => {
        while (x < 0) x += this.width;
        if (x >= this.width) x %= this.width;
        while (y < 0) y += this.height;
        if (y >= this.height) y %= this.height;

        check[x][y] = true;
    }

    public next = (): void => {
        let nextGrid: Array<Array<number>> = this.cloneGrid();
        let nextCheck: Array<Array<boolean>> = Engine.getEmptyCheck(this.width, this.height);

        let value: number;

        for (let i = 0; i < this.width; i++) {
            for (let j = 0; j < this.height; j++) {
                if (this.check[i][j]) {
                    this.rules.forEach((rule: Rule): void => {
                        value = rule.eval(i, j, this.grid);
                        if (value >= 0) {
                            nextGrid[i][j] = value;
                            // Case marquee pour tour suivant
                            this.updateCheck(i, j, nextCheck);
                        }
                    });
                }
            }
        }

        this.grid = nextGrid;
        this.check = nextCheck;
    }
    

    public getGrid =  (): Array<Array<number>> => {
        return this.grid;
    }


    // TODO : Pour test
    public show = (): void => {
        for (let j = 0; j < this.height; j++) {
            let line: string = '';
            for (let i = 0; i < this.width; i++) {
                line += '' + this.grid[i][j];
            }
            console.log(line);
        }
    }
    public showCheck = (): void => {
        for (let j = 0; j < this.height; j++) {
            let line: string = '';
            for (let i = 0; i < this.width; i++) {
                line += this.check[i][j] ? '1' : '0';
            }
            console.log(line);
        }
        
    }
}