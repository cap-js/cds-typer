export type ClassBody = {
    [key: string]: string[]
}

export interface Import {
    imports: string;
    from: string;
    alias: string;
}

export interface TSParseResult {
    classes: {[key: string]: ClassBody},
    declarations: {[key: string]: string},
    imports: Import[]
}

export class TSParser {
    private _parseClassBody(lines: string[]): ClassBody
    public parse(file: string): TSParseResult;
}