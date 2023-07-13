/**
 * Compiles a .cds file to Typescript types.
 * @param inputFile {string} path to input .cds file
 * @param parameters {CompileParameters} path to root directory for all generated files, min log level, etc.
 */
export function compileFromFile(inputFile: string, parameters: CompileParameters): Promise<string[]>;
/**
 * Compiles a CSN object to Typescript types.
 * @param csn {CSN}
 * @param parameters {CompileParameters} path to root directory for all generated files, min log level
 */
export function compileFromCSN(csn: CSN, parameters: CompileParameters): Promise<string[]>;
