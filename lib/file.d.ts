type KVs = [string, string][]
type Namespace = {[key: string]: Buffer}
type ActionParams = [string, string][]

/**
 * String buffer to conveniently append strings to.
 */
 export class Buffer {
    public parts: string[];
    private indentation: string;
    private currentIndent: string;

    constructor(indentation: string);

    /**
     * Indents by the predefined spacing.
     */
    indent(): void;

    /**
     * Removes one level of indentation.
     */
    outdent(): void; 

    /**
     * Concats all elements in the buffer into a single string.
     * @param glue string to intersperse all buffer contents with
     * @returns string spilled buffer contents.
     */
    join(glue: string): string;

    /**
     * Clears the buffer.
     */
    clear(): void;

    /**
     * Adds an element to the buffer with the current indentation level.
     * @param part 
     */
    add(part: string): void;
}

/**
 * Convenience class to handle path qualifiers.
 */
export class Path {
    private parts: string[];

    /**
     * 
     * @param parts parts of the path. 'a.b.c' -> ['a', 'b', 'c']
     * @param kind FIXME: currently unused
     */
    constructor(parts: string[], kind: string);

    /**
     * @returns the path to the parent directory. 'a.b.c'.getParent() -> 'a.b'
     */
    getParent(): Path;

    /**
     * Transfoms the Path into a directory path.
     * @param relative if defined, the path is constructed relative to this directory
     * @param local if set to true, './' is prefixed to the directory
     * @returns directory 'a.b.c'.asDirectory() -> 'a/b/c'
     */
    asDirectory(relative: string | undefined, local: boolean): string;

    /**
     * Transforms the Path into a namespace qualifier.
     * @returns namespace qualifier 'a.b.c'.asNamespace() -> 'a.b.c'
     */
    asNamespace(): string;

    /**
     * Transforms the Path into an identifier that can be used as variable name.
     * @returns identifier 'a.b.c'.asIdentifier() -> '_a_b_c', ''.asIdentifier() -> '_'
     */
    asIdentifier(): string;

    /**
     * @returns true, iff the Path refers to the current working directory, aka './'
     */
    isCwd(relative: string | undefined): boolean;
}

/**
 * Source file containing several buffers.
 */
export class SourceFile {
    public readonly path: Path;
    private imports: {}
    private types: Buffer;
    private classes: Buffer;
    private enums: Buffer;
    private actions: Buffer;
    private namespaces: Namespace;
    private classNames: {}
    private inflections: [string, string][]

    constructor(path: string);

    /**
     * Adds a pair of singular and plural inflection.
     * These are later used to generate the singular -> plural
     * aliases in the index.js file.
     * @param singular singular type without namespace.
     * @param plural plural type without namespace
     * @param original original entity name without namespace. 
     *        In many cases this will be the same as plural.
     */
    addInflection(singular: string, plural: string, original: string);

    /**
     * Adds an action definition in form of a arrow function to the file.
     * @param name name of the action
     * @param params list of parameters, passed as [name, type] pairs
     * @param returns the return type of the action
     */
    addAction(name: string, params: ActionParams, returns: string);

    /**
     * Adds an enum to this file.
     * @param fq fully qualified name of the enum
     * @param name local name of the enum
     * @param kvs list of key-value pairs
     */
    addEnum(fq: string, clean: string, kvs: KVs);

    /**
     * Adds an arbitrary piece of code that is added
     * right after the imports.
     * @param code the preamble code.
     */
    addPreamble(code: string);

    /**
     * Adds a type alias to this file.
     * @param fq fully qualified name of the enum
     * @param name local name of the enum
     * @param rhs the right hand side of the assignment
     */
    addType(fq: string, clean: string, rhs: string);

    /**
     * Adds a class to this file. 
     * This differs from writing to the classes buffer,
     * as it is just a cache to collect all classes that 
     * are supposed to be present in this file. 
     * @param clean cleaned name of the class 
     * @param fq fully qualified name, including the namespace
     */
    addClass(clean: string, fq: string): void;

    /**
     * Retrieves or creates and retrieves a sub namespace
     * with a given name.
     * @param name of the sub namespace.
     * @returns the sub namespace.
     */
    getSubNamespace(name: string): Namespace;

    /**
     * Adds an import if it does not exist yet.
     * @param imp qualifier for the namespace to import.
     */
    addImport(imp: Path): void;

    /**
     * Writes all imports to a buffer, relative to the current file.
     * Creates a new buffer on each call, as concatenating import strings directly
     * upon discovering them would complicate filtering out duplicate entries.
     * @returns all imports written to a buffer.
     */
    getImports(): Buffer;

    /**
     * Creates one string from the buffers representing the type definitions.
     * @returns complete file contents.
     */
    toTypeDefs(): string;

    /**
     * Concats the classnames to an export dictionary 
     * to create the accompanying JS file for the typings.
     * @returns a string containing the module.exports for the JS file.
     */
    toJSExports(): string;
}

/**
 * Base definitions used throughout the typing process,
 * such as Associations and Compositions.
 */
declare const baseDefinitions: SourceFile;

/**
 * Writes the files to disk. For each source, a index.d.ts holding the type definitions
 * and a index.js holding implementation stubs is generated at the appropriate directory.
 * Missing directories are created automatically and asynchronously.
 * @param root root directory to prefix all directories with
 * @param sources source files to write to disk
 * @returns Promise that resolves to a list of all directory paths pointing to generated files.
 */
export function writeout(root: string, sources: SourceFile[]): Promise<string[]>;
