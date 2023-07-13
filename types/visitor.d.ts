export type File = import('./file').File;
export type Context = {
    entity: string;
};
export type CompileParameters = {
    rootDirectory: string;
    logLevel: number;
    jsConfigPath?: string;
};
/**
 * - `propertiesOptional = true` -> all properties are generated as optional ?:. (standard CAP behaviour, where properties be unavailable)
 * - `inlineDeclarations = 'structured'` ->
 */
export type VisitorOptions = {
    propertiesOptional: boolean;
    inlineDeclarations: 'flat' | 'structured';
};
export type Inflection = {
    typeName: string;
    singular: string;
    plural: string;
};
export class Visitor {
    /**
     * @param csn root CSN
     * @param {VisitorOptions} options
     */
    constructor(csn: any, options?: VisitorOptions, logger?: Logger);
    /**
     * Gathers all files that are supposed to be written to
     * the type directory. Including generated source files,
     * as well as library files.
     * @returns {File[]} a full list of files to be written
     */
    getWriteoutFiles(): File[];
    options: {
        propertiesOptional: boolean;
        inlineDeclarations: "flat" | "structured";
    };
    logger: Logger;
    csn: any;
    /** @type {Context[]} **/
    contexts: Context[];
    /** @type {Resolver} */
    resolver: Resolver;
    /** @type {Object<string, File>} */
    files: {
        [x: string]: File;
    };
    inlineDeclarationResolver: StructuredInlineDeclarationResolver | FlatInlineDeclarationResolver;
    /**
     * Determines the file corresponding to the namespace.
     * If no such file exists yet, it is created first.
     * @param {string} path the name of the namespace (foo.bar.baz)
     * @returns {SourceFile} the file corresponding to that namespace name
     */
    getNamespaceFile(path: string): SourceFile;
    /**
     * Visits all definitions within the CSN definitions.
     */
    visitDefinitions(): void;
    /**
     * Transforms an entity or CDS aspect into a JS aspect (aka mixin).
     * That is, for an element A we get:
     * - the function A(B) to mix the aspect into another class B
     * - the const AXtended which represents the entity A with all of its aspects mixed in (this const is not exported)
     * - the type A to use for external typing and is derived from AXtended.
     * @param {string} name the name of the entity
     * @param {CSN} element the pointer into the CSN to extract the elements from
     * @param {Buffer} buffer the buffer to write the resulting definitions into
     * @param {string?} cleanName the clean name to use. If not passed, it is derived from the passed name instead.
     */
    _aspectify(name: string, entity: any, buffer: Buffer, cleanName?: string | null): void;
    /**
     * Visits a single entity from the CSN's definition field.
     * Will call #printEntity or #printAction based on the entity's kind.
     * @param {string} name name of the entity, fully qualified as is used in the definition field.
     * @param {CSN} entity CSN data belonging to the entity to perform lookups in.
     */
    visitEntity(name: string, entity: CSN): void;
    /**
     * A self reference is a property that references the class it appears in.
     * They need to be detected on CDS level, as the emitted TS types will try to
     * refer to refer to types via their alias that hides the aspectification.
     * If we attempt to directly refer to this alias while it has not been fully created,
     * that will result in a TS error.
     * @param {String} entityName
     * @returns {boolean} true, if `entityName` refers to the surrounding class
     * @example
     * ```ts
     * class TreeNode {
     *   value: number
     *   parent: TreeNode // <- self reference
     * }
     * ```
     */
    isSelfReference(entityName: string): boolean;
    /**
     * Visits a single element in an entity.
     * @param {string} name name of the element
     * @param {import('./components/resolver').CSN} element CSN data belonging to the the element.
     * @param {SourceFile} file the namespace file the surrounding entity is being printed into.
     * @param {Buffer} buffer buffer to add the definition to. If no buffer is passed, the passed file's class buffer is used instead.
     * @returns @see InlineDeclarationResolver.visitElement
     */
    visitElement(name: string, element: import('./components/resolver').CSN, file: SourceFile, buffer: Buffer): {
        typeName: string;
        typeInfo: import("./components/resolver").TypeResolveInfo & {
            inflection: Inflection;
        };
    };
    #private;
}
import { Logger } from "./logging";
import { Resolver } from "./components/resolver";
import { StructuredInlineDeclarationResolver } from "./components/inline";
import { FlatInlineDeclarationResolver } from "./components/inline";
import { SourceFile } from "./file";
import { Buffer } from "./file";
