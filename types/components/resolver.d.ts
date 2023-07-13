export type EntityCSN = {
    cardinality?: {
        max?: '*' | number;
    };
};
export type CSN = {
    definitions?: {
        [x: string]: EntityCSN;
    };
};
/**
 * When nested inline types require additional imports. E.g.:
 * ```cds
 * // mymodel.cds
 * Foo {
 *   bar: {
 *     baz: a.b.c.Baz // need to require a.b.c in mymodel.cds!
 *   }
 * }
 * ```
 */
export type TypeResolveInfo = {
    isBuiltin: boolean;
    isInlineDeclaration: boolean;
    isForeignKeyReference: boolean;
    isArray: boolean;
    type: string;
    path?: Path;
    csn?: CSN;
    imports: Path[];
    inner: TypeResolveInfo;
};
export class Resolver {
    /** @param {Visitor} visitor */
    constructor(visitor: Visitor);
    get csn(): any;
    /** @type {Visitor} */
    visitor: Visitor;
    /** @type {Library[]} */
    libraries: Library[];
    /**
     * Returns all libraries that have been referenced at least once.
     * @returns {Library[]}
     */
    getUsedLibraries(): Library[];
    /**
     * Conveniently combines resolveNamespace and trimNamespace
     * to end up with both the resolved Path of the namespace,
     * and the clean name of the class.
     * @param {string} fq the fully qualified name of an entity.
     * @returns {[Path, string]} a tuple, [0] holding the path to the namespace, [1] holding the clean name of the entity.
     */
    untangle(fq: string): [Path, string];
    /**
     * Convenience method to shave off the namespace of a fully qualified path.
     * More specifically, only the parts (reading from right to left) that are of
     * kind "entity" are retained.
     * a.b.c.Foo -> Foo
     * Bar -> Bar
     * sap.cap.Book.text -> Book.text (assuming Book and text are both of kind "entity")
     * @param {string} p path
     * @returns {string} the entity name without leading namespace.
     */
    trimNamespace(p: string): string;
    /**
     * Generates singular and plural inflection for the passed type.
     * Several cases are covered here:
     * - explicit annotation by the user in the CSN
     * - implicitly derived inflection based on simple grammar rules
     * - collisions between singular and plural name (resolved by appending a '_' suffix)
     * - inline type definitions, which don't really have a linguistic plural,
     *   but need to expressed as array type to be consumable by the likes of Composition.of.many<T>
     * @param {import('./resolver').TypeResolveInfo} typeInfo information about the type gathered so far.
     * @param {string} [namespace] namespace the type occurs in. If passed, will be shaved off from the name
     * @returns {Inflection}
     */
    inflect(typeInfo: import('./resolver').TypeResolveInfo, namespace?: string): Inflection;
    /**
     * Convenient API to consume resolveType.
     * Internally calls resolveType, determines how it has to be imported,
     * used, etc. relative to file and just returns the name under
     * which it will finally be known within file.
     *
     * For example:
     * model1.cds contains entity Foo
     * model2.cds references Foo
     *
     * calling resolveAndRequire({... Foo}, model2.d.ts) would then:
     * 1. add an import of model1 to model2 with proper path resolution and alias, e.g. "import * as m1 from './model1'"
     * 2. resolve any singular/ plural issues and association/ composition around it
     * 3. return a properly prefixed name to use within model2.d.ts, e.g. "m1.Foo"
     *
     * @param {CSN} element the CSN element to resolve the type for.
     * @param {SourceFile} file source file for context.
     * @returns {{typeName: string, typeInfo: TypeResolveInfo & { inflection: Inflection } }} info about the resolved type
     */
    resolveAndRequire(element: CSN, file: SourceFile): {
        typeName: string;
        typeInfo: TypeResolveInfo & {
            inflection: Inflection;
        };
    };
    /**
     * Attempts to retrieve the max cardinality of a CSN for an entity.
     * @param {EntityCSN} element csn of entity to retrieve cardinality for
     * @returns {number} max cardinality of the element.
     * If no cardinality is attached to the element, cardinality is 1.
     * If it is set to '*', result is Infinity.
     */
    getMaxCardinality(element: EntityCSN): number;
    /**
     * Resolves the fully qualified name of an entity to its parent entity.
     * resolveParent(a.b.c.D) -> CSN {a.b.c}
     * @param {string} name fully qualified name of the entity to resolve the parent of.
     * @returns {CSN} the resolved parent CSN.
     */
    resolveParent(name: string): CSN;
    /**
     * Resolves a fully qualified identifier to a namespace.
     * In an identifier 'a.b.c.D.E', the namespace is the part of the identifier
     * read from left to right which does not contain a kind 'context' or 'service'.
     * That is, if in the above example 'D' is a context and 'E' is a service,
     * the resulting namespace is 'a.b.c'.
     * @param {string[]} pathParts the distinct parts of the namespace, i.e. ['a','b','c','D','E']
     * @returns {string} the namespace's name, i.e. 'a.b.c'.
     */
    resolveNamespace(pathParts: string[]): string;
    /**
     * Resolves an element's type to either a builtin or a user defined type.
     * Enriched with additional information for improved printout (see return type).
     * @param {CSN} element the CSN element to resolve the type for.
     * @param {SourceFile} file source file for context.
     * @returns {TypeResolveInfo} description of the resolved type
     */
    resolveType(element: CSN, file: SourceFile): TypeResolveInfo;
    /**
     * Attempts to resolve a type that could reference another type.
     * @param {?} val
     * @param {TypeResolveInfo} into see resolveType()
     * @param {SourceFile} file only needed as we may call #resolveInlineDeclarationType from here. Will be expelled at some point.
     */
    resolvePotentialReferenceType(val: unknown, into: TypeResolveInfo, file: SourceFile): void;
    #private;
}
import { Path } from "../file";
import { Visitor } from "../visitor";
import { Library } from "../file";
import { SourceFile } from "../file";
