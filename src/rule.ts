enum TargetType {
    Color,
    NotColor
}

enum OperandType {
    Numeric,
    Color,
    NotColor
}

enum ActionType {
    Color
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

    private targetType: TargetType;
    private targetValue: number;

    // Operands [..X.X.]
    private static readonly OPERAND = '012345678abcdefghABCDEFGHIJKLMNOPQRS';
    private static readonly OPERAND_NUMERIC: string = '012345678';
    private static readonly OPERAND_COLOR: string = 'MABCDEFGH';
    private static readonly OPERAND_NOT_COLOR: string = 'Labcdefgh';

    private leftOperandType: OperandType;
    private leftOperandValue: number;
    private rightOperandType: OperandType;
    private rightOperandValue: number;

    // Operator [...X..]
    private static readonly OPERATOR = 'MN><=!';
    private operator: string;

    // Action [.....X]
    static readonly ACTION = 'ABCDEFGHIJKLMNOoPVRwxyzWXYZ';
    static readonly ACTION_COLOR = 'VABCDEFGH';

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
                // TODO : Continuer
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
                    // TODO : Continuer
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
                    // TODO : Continuer
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
            // TODO : Continuer
        }
    }

    private fail = (message: string): never => {
        throw new Error(message);
    }

    public eval = (x: number, y: number, grid: Array<Array<number>>): number => {
        // Check target cell
        switch (this.targetType) {
            case TargetType.Color:
                if (grid[x][y] != this.targetValue) {
                    return -1;
                }
            break;
            case TargetType.NotColor:
                if (grid[x][y] == 0 || grid[x][y] == this.targetValue) {
                    return -1;
                }        
            break;
        }

        // Left operand
        let op1: number;
        switch (this.leftOperandType) {
            case OperandType.Numeric:
                op1 = this.leftOperandValue;
            break;
            case OperandType.Color:
                op1 = 0;
                this.neighborsGrid.forEach((coords: Array<number>): void => {
                    if (this.getCell(x + coords[0], y + coords[1], grid) == this.leftOperandValue) op1++;
                })
            break;
        }

        // Right operand
        let op2: number;
        switch (this.rightOperandType) {
            case OperandType.Numeric:
                op2 = this.rightOperandValue;
            break;
            case OperandType.Color:
                op2 = 0;
                this.neighborsGrid.forEach((coords: Array<number>): void => {
                    if (this.getCell(x + coords[0], y + coords[1], grid) == this.rightOperandValue) op2++;
                })
            break;
        }

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
        switch (this.actionType) {
            case ActionType.Color:
                return this.actionValue;
        }

        return -3;
    }


    private getCell = (x: number, y: number, grid: Array<Array<number>>): number => {
        while (x < 0) x += grid.length;
        if (x >= grid.length) x %= grid.length;
        while (y < 0) y += grid[0].length;
        if (y >= grid[0].length) y %= grid[0].length;

        return grid[x][y];
    }


}
