enum TargetType {
    Color,
    NotColor,
    Any,
    Marked,
    NotMarked
}

enum OperandType {
    Numeric,
    Color, 
    NotColor, 
    SameColor,
    DifferentColor,
    CountColors,
    Color12,
    Color34,
    Color13,
    Color23,
    Color123,
    Color1234
}

enum ActionType {
    Color,
    Mark,
    ResetMark,
    NextColor,
    PreviousColor,
    CycleNextColor,
    CyclePreviousColor,
    CycleNextNotEmpty,
    CyclePreviousNotEmpty,
    CancelChange,
    EraseMarks,
    FillMost,
    Random
}


export class Rule {

    // Neighborhood [X.....]
    private static readonly NEIGHBORS: string = '0248';
    private static readonly NEIGHBORS_GRID: number[][][] = [
        [], // 0
        [[-1, 0], [1, 0]], // 2
        [[-1, 0], [1, 0], [0, -1], [0, 1]], // 4
        [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [1, -1], [-1, 1], [1, 1]] // 8
    ];

    private neighborsGrid: number[][];

    // Target cell [.X....]
    private static readonly TARGET_CELL: string = 'abcdefghABCDEFGHVPTwxyzWXYZ';
    private static readonly TARGET_COLOR: string = 'VABCDEFGH';
    private static readonly TARGET_NOT_COLOR: string = 'Pabcdefgh';
    private static readonly TARGET_MARKED: string = '>WXYZ';
    private static readonly TARGET_NOT_MARKED: string = '>wxyz';

    private targetType: TargetType;
    private targetValue: number;

    // Operands [..X.X.]
    private static readonly OPERAND: string = '012345678abcdefghABCDEFGHIJKLMNOPQRS';
    private static readonly OPERAND_NUMERIC: string = '012345678';
    private static readonly OPERAND_COLOR: string = 'MABCDEFGH';
    private static readonly OPERAND_NOT_COLOR: string = 'Labcdefgh';
    private static readonly OPERAND_OTHER: string = 'IJKNOPQRS';
    private static readonly OPERAND_OTHER_TYPE: Array<OperandType> = [
        OperandType.SameColor, OperandType.DifferentColor, OperandType.CountColors,
        OperandType.Color12, OperandType.Color34, OperandType.Color13, 
        OperandType.Color23, OperandType.Color123, OperandType.Color1234    
    ];

    private leftOperandType: OperandType;
    private leftOperandValue: number;
    private rightOperandType: OperandType;
    private rightOperandValue: number;

    // Operator [...X..]
    private static readonly OPERATOR: string = 'MN><=!';
    private operator: string;

    // Action [.....X]
    private static readonly ACTION: string = 'ABCDEFGHIJKLMNOoPVRwxyzWXYZ';
    private static readonly ACTION_COLOR: string = 'VABCDEFGH';
    private static readonly ACTION_MARK: string = '>WXYZ';
    private static readonly ACTION_RESET_MARK: string = '>wxyz';
    private static readonly ACTION_OTHER: string = 'IJKLMNOoPR';
    private static readonly ACTION_OTHER_TYPE: Array<ActionType> = [
        ActionType.NextColor, ActionType.PreviousColor, ActionType.CycleNextColor,
        ActionType.CyclePreviousColor, ActionType.CycleNextNotEmpty, 
        ActionType.CyclePreviousNotEmpty, ActionType.CancelChange, 
        ActionType.EraseMarks, ActionType.FillMost, ActionType.Random    
    ];



    private actionType: ActionType;
    private actionValue: number;

    constructor(private rule: string) {
        // length
        if (this.rule.length != 6) {
            this.fail('Invalid length (' + this.rule.length + ' != 6)');
        }

        // Neighborhood [X.....]
        let idx = Rule.NEIGHBORS.indexOf(this.rule[0]);
        if (idx == -1) {
            this.fail('Invalid neighbor type [' + this.rule[0] + ']');
        }
        this.neighborsGrid = Rule.NEIGHBORS_GRID[idx];

        // Target cell [.X....]
        if (Rule.TARGET_CELL.indexOf(this.rule[1]) == -1) {
            this.fail('Invalid target type [' + this.rule[1] + ']');
        }
        idx = Rule.TARGET_COLOR.indexOf(this.rule[1]);
        if (idx > -1) {
            this.targetType = TargetType.Color;
            this.targetValue = idx;
        } else {
            idx = Rule.TARGET_NOT_COLOR.indexOf(this.rule[1]);
            if (idx > -1) {
                this.targetType = TargetType.NotColor;
                this.targetValue = idx;
            } else {
                idx = Rule.TARGET_MARKED.indexOf(this.rule[1]);
                if (idx > -1) {
                    this.targetType = TargetType.Marked;
                    this.targetValue = (1 << idx);
                } else {
                    idx = Rule.TARGET_NOT_MARKED.indexOf(this.rule[1]);
                    if (idx > -1) {
                        this.targetType = TargetType.NotMarked;
                        this.targetValue = (1 << idx);
                    } else {
                        this.targetType = TargetType.Any;
                        // this.targetValue undefined
                    }    
                }
            }
        }

        // Left Operand [..X...]
        if (Rule.OPERAND.indexOf(this.rule[2]) == -1) {
            this.fail('Invalid left operand [' + this.rule[2] + ']');
        }
        idx = Rule.OPERAND_NUMERIC.indexOf(this.rule[2]);
        if (idx > -1) {
            this.leftOperandType = OperandType.Numeric;
            this.leftOperandValue = idx;
        } else {
            idx = Rule.OPERAND_COLOR.indexOf(this.rule[2]);
            if (idx > -1) {
                this.leftOperandType = OperandType.Color;
                this.leftOperandValue = idx;
            } else {
                idx = Rule.OPERAND_NOT_COLOR.indexOf(this.rule[2]);
                if (idx > -1) { // 
                    this.leftOperandType = OperandType.NotColor;
                    this.leftOperandValue = idx;    
                } else {
                    idx = Rule.OPERAND_OTHER.indexOf(this.rule[2]);
                    this.leftOperandType = Rule.OPERAND_OTHER_TYPE[idx];
                    // this.leftOperandValue undefined
                }
            }
        }

        // Operator [...X..]
        if (Rule.OPERATOR.indexOf(this.rule[3]) == -1) {
            this.fail('Invalid operator [' + this.rule[3] + ']');
        }
        this.operator = this.rule[3];

        // Right Operand [....X.]
        if (Rule.OPERAND.indexOf(this.rule[4]) == -1) {
            this.fail('Invalid left operand [' + this.rule[4] + ']');
        }
        idx = Rule.OPERAND_NUMERIC.indexOf(this.rule[4]);
        if (idx > -1) {
            this.rightOperandType = OperandType.Numeric;
            this.rightOperandValue = idx;
        } else {
            idx = Rule.OPERAND_COLOR.indexOf(this.rule[4]);
            if (idx > -1) {
                this.rightOperandType = OperandType.Color;
                this.rightOperandValue = idx;        
            } else {
                idx = Rule.OPERAND_NOT_COLOR.indexOf(this.rule[4]);
                if (idx > -1) { // 
                    this.rightOperandType = OperandType.NotColor;
                    this.rightOperandValue = idx;    
                } else {
                    idx = Rule.OPERAND_OTHER.indexOf(this.rule[4]);
                    this.leftOperandType = Rule.OPERAND_OTHER_TYPE[idx];
                    // this.rightOperandValue undefined
                }
            }
        }

        // Action [.....X]
        if (Rule.ACTION.indexOf(this.rule[5]) == -1) {
            this.fail('Invalid action [' + this.rule[5] + ']');
        }
        idx = Rule.ACTION_COLOR.indexOf(this.rule[5]);
        if (idx > -1) {
            this.actionType = ActionType.Color;
            this.actionValue = idx;
        } else {
            idx = Rule.ACTION_MARK.indexOf(this.rule[5]);
            if (idx > -1) {
                this.actionType = ActionType.Mark;
                this.actionValue = idx;
            } else {
                idx = Rule.ACTION_RESET_MARK.indexOf(this.rule[5]);
                if (idx > -1) {
                    this.actionType = ActionType.ResetMark;
                    this.actionValue = idx;
                } else {
                    idx = Rule.ACTION_OTHER.indexOf(this.rule[5]);
                    this.actionType = Rule.ACTION_OTHER_TYPE[idx];
                    // this.actionValue undefined
                }    
            }
        }
    }

    private fail = (message: string): never => {
        throw new Error(message);
    }


    private evalOperand(x: number, y: number, grid: Array<Array<number>>, 
        type: OperandType, value: number, ref: number): number {

        let op: number = 0;

        switch (type) {
            case OperandType.Numeric:
                op = value;
            break;
            case OperandType.Color:
                this.neighborsGrid.forEach((coords: Array<number>): void => {
                    if (this.getCell(x + coords[0], y + coords[1], grid) == value) op++;
                });
            break;
            case OperandType.NotColor:
                this.neighborsGrid.forEach((coords: Array<number>): void => {
                    if (this.getCell(x + coords[0], y + coords[1], grid) > 0
                        && this.getCell(x + coords[0], y + coords[1], grid) != value) op++;
                });
            break;
            case OperandType.SameColor:
                this.neighborsGrid.forEach((coords: Array<number>): void => {
                    if (this.getCell(x + coords[0], y + coords[1], grid) == ref) op++;
                });
            break;
            case OperandType.DifferentColor:
                this.neighborsGrid.forEach((coords: Array<number>): void => {
                    if (this.getCell(x + coords[0], y + coords[1], grid) > 0
                        && this.getCell(x + coords[0], y + coords[1], grid) != ref) op++;
                });
            break;
            case OperandType.CountColors:
                let colors: Array<boolean> = [true, false, false, false, false, false, false, false, false];
                this.neighborsGrid.forEach((coords: Array<number>): void => {
                    if (!colors[this.getCell(x + coords[0], y + coords[1], grid)]) {
                        colors[this.getCell(x + coords[0], y + coords[1], grid)] = true;
                        op++;
                    }
                });
            break;
            case OperandType.Color12:
                this.neighborsGrid.forEach((coords: Array<number>): void => {
                    if (this.getCell(x + coords[0], y + coords[1], grid) == 1
                        || this.getCell(x + coords[0], y + coords[1], grid) == 2) op++;
                });
            break;
            case OperandType.Color34:
                this.neighborsGrid.forEach((coords: Array<number>): void => {
                    if (this.getCell(x + coords[0], y + coords[1], grid) == 3
                        || this.getCell(x + coords[0], y + coords[1], grid) == 4) op++;
                });
            break;
            case OperandType.Color13:
                this.neighborsGrid.forEach((coords: Array<number>): void => {
                    if (this.getCell(x + coords[0], y + coords[1], grid) == 1
                        || this.getCell(x + coords[0], y + coords[1], grid) == 3) op++;
                });
            break;
            case OperandType.Color23:
                this.neighborsGrid.forEach((coords: Array<number>): void => {
                    if (this.getCell(x + coords[0], y + coords[1], grid) == 2
                        || this.getCell(x + coords[0], y + coords[1], grid) == 3) op++;
                });
            break;
            case OperandType.Color123:
                this.neighborsGrid.forEach((coords: Array<number>): void => {
                    if (this.getCell(x + coords[0], y + coords[1], grid) >= 1
                        && this.getCell(x + coords[0], y + coords[1], grid) <= 3) op++;
                });
            break;
            case OperandType.Color1234:
                this.neighborsGrid.forEach((coords: Array<number>): void => {
                    if (this.getCell(x + coords[0], y + coords[1], grid) >= 1
                        && this.getCell(x + coords[0], y + coords[1], grid) <= 4) op++;
                });
            break;
        }

        return op;
    }


    public eval = (x: number, y: number, grid: Array<Array<number>>, maxColor: number): number => {

        let value: number = grid[x][y] & 0xF;
        let mark: number = (grid[x][y] >> 4);

        // Check target cell
        switch (this.targetType) {
            case TargetType.Color:
                if (value != this.targetValue) {
                    return -1;
                }
            break;
            case TargetType.NotColor:
                if (value == 0 || value == this.targetValue) {
                    return -1;
                }        
            break;
            case TargetType.Any:
                // Any cell => No filter
            break;
            case TargetType.Marked:
                if ((mark && this.targetValue) == 0) {
                    return -1;
                }
            break;
            case TargetType.NotMarked:
                if ((mark && this.targetValue) > 0) {
                    return -1;
                }
            break;
        }

        // Left operand
        let op1: number = this.evalOperand(x, y, grid, this.leftOperandType, this.leftOperandValue, value);
        // Right operand
        let op2: number = this.evalOperand(x, y, grid, this.rightOperandType, this.rightOperandValue, value);

        // Operation
        switch (this.operator) {
            case 'M':
                if (op1 % op2 != 0) return -2;
            break;
            case 'N':
                if (op1 % op2 == 0) return -2;
            break;
            case '>':
                if (op1 <= op2) return -2;
            break;
            case '<':
                if (op1 >= op2) return -2;
            break;
            case '=':
                if (op1 != op2) return -2;
            break;
            case '!':
                if (op1 == op2) return -2;
            break;
        }

        // Action
        let returnValue: number = value;
        let returnMark: number = mark;

        switch (this.actionType) {
            case ActionType.Color:
                returnValue = this.actionValue;
            break;
            case ActionType.Mark:
                returnMark |= (1 << this.actionValue);
            break;
            case ActionType.ResetMark:
                if ((returnMark & (1 << this.actionValue)) > 0) {
                    returnMark ^= (1 << this.actionValue);
                }
            break;
            case ActionType.NextColor:
                returnValue = Math.min(maxColor, returnValue + 1);
            break;
            case ActionType.PreviousColor:
            returnValue = Math.max(0, returnValue - 1);
            break;
            case ActionType.CycleNextColor:
                returnValue = (returnValue + 1) % maxColor;
            break;
            case ActionType.CyclePreviousColor:
                returnValue--;
                if (returnValue < 0) returnValue = maxColor;
            break;
            case ActionType.CycleNextNotEmpty:
                returnValue++;
                if (returnValue > maxColor) returnValue = 1;
            break;
            case ActionType.CyclePreviousNotEmpty:
                returnValue--;
                if (returnValue < 1) returnValue = maxColor;
            break;
            case ActionType.CancelChange:
                // Force value of precedent gen => nothing more to set
            break;
            case ActionType.EraseMarks:
                returnMark = 0;
            break;
            case ActionType.FillMost:
                let colors: Array<number> = [-10, 0, 0, 0, 0, 0, 0, 0, 0];
                this.neighborsGrid.forEach((coords: Array<number>): void => {
                    colors[this.getCell(x + coords[0], y + coords[1], grid)]++;
                });

                let max: number = -1;
                colors.forEach((count: number, idx: number): void => {
                    if (count > max) {
                        max = count;
                        returnValue = idx;
                    }
                })

                if (max == -1) {
                    return -3; // No cell (or no neighbor to check)
                }
            break;
            case ActionType.Random:
                returnValue = Math.floor(Math.random() * maxColor) + 1
            break;
        }

        return returnValue + (returnMark << 4);
    }


    private getCell = (x: number, y: number, grid: Array<Array<number>>): number => {
        while (x < 0) x += grid.length;
        if (x >= grid.length) x %= grid.length;
        while (y < 0) y += grid[0].length;
        if (y >= grid[0].length) y %= grid[0].length;

        return grid[x][y] & 15;
    }


}
