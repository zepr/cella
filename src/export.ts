import Zepr = require('zepr.ts');

import { Engine } from './engine';

/**
 * Structure used to store a whole game
 */
export interface StoreData {
    // Grid
    gridWidth: number;
    gridHeight: number;
    gridX: number;
    gridY: number;
    grid: string;

    // Rules
    colors: number;
    rules: Array<string>;

    // Scene
    zoom: number;
    x: number;
    y: number;
}




/**
 * Class used to manage import/export. 
 * Grid coords (Rectangle) used in export functions are defined from the upper-left corner.
 */
export class Export {

    private constructor() {}


    /** Scene to load */
    public static storeData: StoreData;


    /**
     * Encodes a grid as a base64 array
     * @param grid The grid to encode
     * @param area A facultative subset of the grid to encode
     */
    public static encodeGrid(grid: Array<Array<number>>, area?: Zepr.Rectangle): string {
        if (area == null) {
            area = new Zepr.Rectangle(0, 0, grid.length, grid[0].length);
        }

        let rawString: string = '';
        let x, y: number;

        for (let j = 0; j < area.height; j++) {
            y = (j + area.y) % grid[0].length;
            x = area.x;
            for (let i = 0; i < area.width; i++) {
                x %= grid.length;
                rawString += String.fromCharCode(grid[x][y]);
                x++;
            }
        }
        
        return btoa(rawString);
    }


    /**
     * Generate a 512 * 512 from an encoded grid
     * @param base64 Encoded grid data
     * @param area A facultative subset of the grid to decode
     */
    public static decodeGrid(base64: string, area?: Zepr.Rectangle): Array<Array<number>> {
        if (area == null) {
            area = new Zepr.Rectangle(0, 0, 512, 512);
        }        
        
        let grid: Array<Array<number>> = Engine.getEmptyGrid(512, 512);

        let decoded: string = atob(base64);
        let x: number = area.x;
        let y: number = area.y;
        let idx: number = 0;
        for (let i = 0; i < decoded.length; i++) {
            grid[x][y] = decoded.charCodeAt(i);
            x++;
            idx++;
            if (idx == area.width) {
                x = area.x;
                y++;
                idx = 0;
            }

            x %= 512;
            y %= 512;
        }

        return grid;
    }



    /**
     * Extracts area with content from grid
     * @param grid The grid to analyze
     * 
     * @returns A rectangle containg all non-empty elemnts of the grid (may escape bounds)
     */
    public static getAreaOfInterest(grid: Array<Array<number>>): Zepr.Rectangle {

        let columns: Array<number> = new Array<number>();
        let lines: Array<number> = new Array<number>();
        let value: number;

        // Count values per column
        grid.forEach((c: Array<number>): void => {
            value = 0;
            c.forEach((v: number): void => {
                if ((v & 0xF) > 0) value++;
            });
            columns.push(value);
        });

        // Count value per line
        grid[0].forEach((l: number, idx: number): void => {
            value = 0;
            grid.forEach((c: Array<number>): void => {
                if ((c[idx] & 0xF) > 0) value++;
            });
            lines.push(value);
        });

        let colData = Export.getLine(columns);
        let lineData = Export.getLine(lines);

        let rect: Zepr.Rectangle;
        if (colData[1] < 1 || lineData[1] < 1) {
            // Empty rect
            rect = new Zepr.Rectangle();
        } else {
            rect = new Zepr.Rectangle(colData[0], lineData[0], colData[1], lineData[1]);
        }
        return rect;
    }

    /**
     * Identifies largest empty area
     * @param line Line to check
     * 
     * @returns An array of two elements. The first one is the position of the first item, the second one is the width of non-empty items (circular)
     */
    private static getLine(line: Array<number>): Array<number> {

        let values: Array<number> = new Array<number>();
        let current: number = 0;

        // Count values
        line.forEach((value: number): void => {
            if (value == 0) {
                current++;
            } else {
                current = 0;
            }
            values.push(current);
        });

        // Complete circular
        line.some((value: number, idx: number): boolean => {
            if (value == 0) {
                values[idx] += values[values.length - 1];
            }
            return value > 0;
        });

        // Get biggest value
        let maxValue: number = 0;
        let maxPos: number = -1;

        values.forEach((value: number, idx: number): void => {
            if (value > maxValue) {
                maxValue = value;
                maxPos = idx;
            }
        });

        let output: Array<number> = new Array<number>();
        output.push(maxPos + 1);
        output.push(line.length - maxValue);

        return output;
    }
}