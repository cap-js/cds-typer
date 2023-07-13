/**
 * Resolves inline declarations in a flat fashion.
 * @example
 * ```cds
 * // cds
 * entity E {
 *   x: { a: Integer; b: String; }
 * }
 * ```
 * ↓
 * ```ts
 * // ts
 * class E {
 *   x_a: number;
 *   x_b: string;
 * }
 * ```
 */
export class FlatInlineDeclarationResolver extends InlineDeclarationResolver {
    constructor(visitor: any);
    prefix(p: any): string;
    flatten(prefix: any, type: any): any;
    printInlineType(name: any, type: any, buffer: any): void;
    getTypeLookup(members: any): string;
}
/**
 * Resolves inline declarations to a structured type.
 * @example
 * ```cds
 * // cds
 * entity E {
 *   x: { a: Integer; b: String; }
 * }
 * ```
 * ↓
 * ```ts
 * // ts
 * class E {
 *   x: { a: number; b: string; }
 * }
 * ```
 */
export class StructuredInlineDeclarationResolver extends InlineDeclarationResolver {
    constructor(visitor: any);
    printDepth: number;
    flatten(name: any, type: any, buffer: any, statementEnd?: string): any;
    printInlineType(name: any, type: any, buffer: any, statementEnd: any): void;
    getTypeLookup(members: any): any;
}
/**
 * Inline declarations of types can come in different flavours.
 * The compiler can therefore be adjusted to print out one or the other
 * by plugging different implementations of this abstract class into
 * their resolution mechanism.
 */
declare class InlineDeclarationResolver {
    /** @param {import('../visitor').Visitor} visitor */
    constructor(visitor: import('../visitor').Visitor);
    /**
     * @param {string} name
     * @param {import('./resolver').TypeResolveInfo} type
     * @param {import('../file').Buffer} buffer
     * @param {string} statementEnd
     * @protected
     * @abstract
     */
    protected printInlineType(name: string, type: import('./resolver').TypeResolveInfo, buffer: import('../file').Buffer, statementEnd: string): void;
    /**
     * Attempts to resolve a type that could reference another type.
     * @param {any} items
     * @param {import('./resolver').TypeResolveInfo} into @see Visitor.resolveType
     * @param {SourceFile} file temporary file to resolve dummy types into.
     * @public
     */
    public resolveInlineDeclaration(items: any, into: import('./resolver').TypeResolveInfo, relativeTo: any): void;
    /**
     * Visits a single element in an entity.
     * @param {string} name name of the element
     * @param {import('./resolver').CSN} element CSN data belonging to the the element.
     * @param {SourceFile} file the namespace file the surrounding entity is being printed into.
     * @param {Buffer} [buffer] buffer to add the definition to. If no buffer is passed, the passed file's class buffer is used instead.
     * @public
     */
    public visitElement(name: string, element: import('./resolver').CSN, file: SourceFile, buffer?: Buffer): {
        typeName: string;
        typeInfo: import("./resolver").TypeResolveInfo & {
            inflection: Inflection;
        };
    };
    /**
     * Separator between value V and type T: `v : T`.
     * Depending on the visitor's setting, this is may be `?:` for optional
     * properties or `:` for required properties.
     * @returns {'?:'|':'}
     */
    getPropertyTypeSeparator(): '?:' | ':';
    visitor: import("../visitor").Visitor;
    depth: number;
    /**
     * Produces a string representation of how to produce a [Typescript type lookup](https://www.typescriptlang.org/docs/handbook/2/indexed-access-types.html#handbook-content)
     * under the current configuration.
     * @example
     * ```ts
     * type T = {
     *   a: {
     *     b: number
     *   }
     * }
     *
     * T['a']['b']  // number
     * ```
     * but especially with inline declarations, the access will differ between flattened and nested representations.
     * @param {string[]} members a list of members, in the above example it would be `['a', 'b']`
     * @returns {string} type access string snippet. In the above sample, we would return `"['a']['b']"`
     * @public
     * @abstract
     */
    public getTypeLookup(members: string[]): string;
}
import { SourceFile } from "../file";
import { Buffer } from "../file";
export {};
