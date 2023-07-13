export type Namespace = {
    [x: string]: Buffer;
};
/**
 * Library files that contain predefined types.
 * For example, the cap.hana types are included in a separate predefined library file
 * which is only included if the model that is being compiled references any of these types.
 * A library is uniquely identified by the namespace it represents. That namespace is directly
 * derived from the file's name. i.e. path/to/file/cap.hana.ts will be considered to hold
 * definitions describing the namespace "cap.hana".
 * These files are supposed to contain fully usable types, not CSN or a CDS file, as they are just
 * being copied verbatim when they are being used.
 */
export class Library extends File {
    constructor(file: any);
    contents: string;
    /**
     * The path to the file where the lib definitions are stored (some/path/name.space.ts)
     * @type {string}
     * @private
     */
    private file;
    /**
     * List of entity names (plain, without namespace)
     * @type {string[]}
     */
    entities: string[];
    /**
     * Namespace (a.b.c.d)
     * @type {string}
     */
    namespace: string;
    /**
     * Whether this library was referenced at least once
     * @type {boolean}
     */
    referenced: boolean;
    /**
     * The Path for this library file, which is constructed from its namespace.
     * @type {Path}
     */
    path: Path;
    /**
     * Whether this library offers an entity of a given type (fully qualified).
     * @param {string} entity the entity's name, e.g. cap.hana.TINYINT
     * @returns {boolean} true, iff the namespace inferred from the passed string matches that of this library
     *          and this library contains a class of that name. i.e.:
     *          ```js
     *          new Library('cap.hana.ts').offers('cap.hana.TINYINT') // -> true`
     *          ```
     */
    offers(entity: string): boolean;
}
/**
 * String buffer to conveniently append strings to.
 */
export class Buffer {
    /**
     * @param {string} indentation
     */
    constructor(indentation?: string);
    /**
     * @type {string[]}
     */
    parts: string[];
    /**
     * @type {string}
     */
    indentation: string;
    /**
     * @type {string}
     */
    currentIndent: string;
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
     * @param {string} glue string to intersperse all buffer contents with
     * @returns {string} string spilled buffer contents.
     */
    join(glue?: string): string;
    /**
     * Clears the buffer.
     */
    clear(): void;
    /**
     * Adds an element to the buffer with the current indentation level.
     * @param {string} part
     */
    add(part: string): void;
}
/** @typedef {Object<string, Buffer>} Namespace */
export class File {
    /**
     * Creates one string from the buffers representing the type definitions.
     * @returns {string} complete file contents.
     */
    toTypeDefs(): string;
    /**
     * Concats the classnames to an export dictionary
     * to create the accompanying JS file for the typings.
     * @returns {string} a string containing the module.exports for the JS file.
     */
    toJSExports(): string;
}
/**
 * Source file containing several buffers.
 */
export class SourceFile extends File {
    static stringifyLambda(name: any, parameters?: any[], returns?: string): string;
    constructor(path: any);
    /** @type {Path} */
    path: Path;
    /** @type {Object} */
    imports: any;
    /** @type {Buffer} */
    preamble: Buffer;
    /** @type {Buffer} */
    types: Buffer;
    /** @type {{ buffer: Buffer, fqs: {name: string, fq: string}[]}} */
    enums: {
        buffer: Buffer;
        fqs: {
            name: string;
            fq: string;
        }[];
    };
    /** @type {Buffer} */
    classes: Buffer;
    /** @type {{ buffer: Buffer, names: string[]}} */
    actions: {
        buffer: Buffer;
        names: string[];
    };
    /** @type {Buffer} */
    aspects: Buffer;
    /** @type {Namespace} */
    namespaces: Namespace;
    /** @type {Object<string, any>} */
    classNames: {
        [x: string]: any;
    };
    /** @type {Object<string, any>} */
    typeNames: {
        [x: string]: any;
    };
    /** @type {[string, string, string][]} */
    inflections: [string, string, string][];
    /**
     * Adds a pair of singular and plural inflection.
     * These are later used to generate the singular -> plural
     * aliases in the index.js file.
     * @param {string} singular singular type without namespace.
     * @param {string} plural plural type without namespace
     * @param {string} original original entity name without namespace.
     *        In many cases this will be the same as plural.
     */
    addInflection(singular: string, plural: string, original: string): void;
    /**
     * Adds a function definition in form of a arrow function to the file.
     * @param {string} name name of the function
     * @param {{relative: string | undefined, local: boolean, posix: boolean}} params list of parameters, passed as [name, type] pairs
     * @param returns the return type of the function
     */
    addFunction(name: string, params: {
        relative: string | undefined;
        local: boolean;
        posix: boolean;
    }, returns: any): void;
    /**
     * Adds an action definition in form of a arrow function to the file.
     * @param {string} name name of the action
     * @param {{relative: string | undefined, local: boolean, posix: boolean}} params list of parameters, passed as [name, type] pairs
     * @param returns the return type of the action
     */
    addAction(name: string, params: {
        relative: string | undefined;
        local: boolean;
        posix: boolean;
    }, returns: any): void;
    /**
     * Retrieves or creates and retrieves a sub namespace
     * with a given name.
     * @param {string} name of the sub namespace.
     * @returns {Namespace} the sub namespace.
     */
    getSubNamespace(name: string): Namespace;
    /**
     * Adds an enum to this file.
     * @param {string} fq fully qualified name of the enum
     * @param {string} name local name of the enum
     * @param {[string, string][]} kvs list of key-value pairs
     */
    addEnum(fq: string, name: string, kvs: [string, string][]): void;
    /**
     * Adds a class to this file.
     * This differs from writing to the classes buffer,
     * as it is just a cache to collect all classes that
     * are supposed to be present in this file.
     * @param {string} clean cleaned name of the class
     * @param {string} fq fully qualified name, including the namespace
     */
    addClass(clean: string, fq: string): void;
    /**
     * Adds an import if it does not exist yet.
     * @param {Path} imp qualifier for the namespace to import.
     */
    addImport(imp: Path): void;
    /**
     * Adds an arbitrary piece of code that is added
     * right after the imports.
     * @param {string} code the preamble code.
     */
    addPreamble(code: string): void;
    /**
     * Adds a type alias to this file.
     * @param {string} fq fully qualified name of the enum
     * @param {string} name local name of the enum
     * @param {string} rhs the right hand side of the assignment
     */
    addType(fq: string, clean: any, rhs: string): void;
    /**
     * Writes all imports to a buffer, relative to the current file.
     * Creates a new buffer on each call, as concatenating import strings directly
     * upon discovering them would complicate filtering out duplicate entries.
     * @returns {Buffer} all imports written to a buffer.
     */
    getImports(): Buffer;
}
/**
 * Convenience class to handle path qualifiers.
 */
export class Path {
    /**
     * @param {string[]} parts parts of the path. 'a.b.c' -> ['a', 'b', 'c']
     * @param kind FIXME: currently unused
     */
    constructor(parts: string[], kind: any);
    parts: string[];
    kind: any;
    /**
     * @returns {Path} the path to the parent directory. 'a.b.c'.getParent() -> 'a.b'
     */
    getParent(): Path;
    /**
     * Transfoms the Path into a directory path.
     * @param {string?} params.relative if defined, the path is constructed relative to this directory
     * @param {boolean} params.local if set to true, './' is prefixed to the directory
     * @param {boolean} params.posix if set to true, all slashes will be forward slashes on every OS. Useful for require/ import
     * @returns {string} directory 'a.b.c'.asDirectory() -> 'a/b/c' (or a\b\c when on Windows without passing posix = true)
     */
    asDirectory(params?: {}): string;
    /**
     * Transforms the Path into a namespace qualifier.
     * @returns {string} namespace qualifier 'a.b.c'.asNamespace() -> 'a.b.c'
     */
    asNamespace(): string;
    /**
     * Transforms the Path into an identifier that can be used as variable name.
     * @returns {string} identifier 'a.b.c'.asIdentifier() -> '_a_b_c', ''.asIdentifier() -> '_'
     */
    asIdentifier(): string;
    /**
     * @returns {boolean} true, iff the Path refers to the current working directory, aka './'
     */
    isCwd(relative?: any): boolean;
}
/**
 * Writes the files to disk. For each source, a index.d.ts holding the type definitions
 * and a index.js holding implementation stubs is generated at the appropriate directory.
 * Missing directories are created automatically and asynchronously.
 * @param {string} root root directory to prefix all directories with
 * @param {File[]} sources source files to write to disk
 * @returns {Promise<string[]>} Promise that resolves to a list of all directory paths pointing to generated files.
 */
export function writeout(root: string, sources: File[]): Promise<string[]>;
/**
 * Base definitions used throughout the typing process,
 * such as Associations and Compositions.
 * @type {SourceFile}
 */
export const baseDefinitions: SourceFile;
