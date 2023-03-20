import { Path, SourceFile} from './file'
import { Logger } from './logging';

// mock
interface CSN {
    definitions?: { [key: string]: EntityCSN }
}

interface EntityCSN {
    cardinality?: {
        max?: '*' | number
    }
}

interface TypeResolveInfo {
    isBuiltin: boolean,
    isInlineDefinition: boolean,
    isForeignKeyReference: boolean,
    type: string, 
    path?: Path,
    csn?: CSN,
    
    /**
     * When nested inline types require additional imports. E.g.:
     * // mymodel.cds
     * Foo {
     *   bar: {
     *     baz: a.b.c.Baz // need to require a.b.c in mymodel.cds!
     *   }
     * }
     */
    imports: Path[]
}

interface CompileParameters {
    outDirectory: string,
    cdsRoot: string,
    logLevel: number,
    jsConfigPath?: string
}

interface VisitorOptions {
    // if set to true, _all_ properties are generated as optional ?:.
    // This is the standard CAP behaviour, where any property could not be available/ not yet be constructed
    // at any point
    propertiesOptional: boolean
}

type VisitorParameters = { logger?: Logger, options?: VisitorOptions }

/**
 * Compiles a .cds file to Typescript types.
 * @param inputFile path to input .cds file
 * @param parameters path to root directory for all generated files, min log level
 */
export function compileFromFile(inputFile: string, parameters: CompileParameters): Promise<string[]>;

/**
 * Compiles a CSN object to Typescript types.
 * @param csn CSN
 * @param parameters path to root directory for all generated files, min log level
 */
export function compileFromCSN(csn: CSN, parameters: CompileParameters): Promise<string[]>;

/**
 * Writes the accompanying jsconfig.json file to the specified paths.
 * Tries to merge nicely if an existing file is found.
 * @param file filepath to jsconfig.json.
 * @param logger logger
 */
export function writeJsConfig(file: string, logger: Logger);

export class Visitor {
    /**
     * @param csn root CSN
     */
    constructor(csn: CSN, params: VisitorParameters);

    /**
     * Determines the file corresponding to the namespace.
     * If no such file exists yet, it is created first.
     * @param {string} path the name of the namespace (foo.bar.baz)
     * @returns the file corresponding to that namespace name
     */
    private getNamespaceFile(path: Path): SourceFile;

    /**
     * Conveniently combines _resolveNamespace and _trimNamespace
     * to end up with both the resolved Path of the namespace,
     * and the clean name of the class.
     * @param fq the fully qualified name of an entity.
     * @returns a tuple, [0] holding the path to the namespace, [1] holding the clean name of the entity.
     */ 
    private untangle(fq: string): [Path, string];

    /**
     * Visits all definitions within the CSN definitions.
     */
    private visitDefinitions(): void;

    /**
     * Visits a single entity from the CSN's definition field.
     * Will call _printEntity or _printAction based on the entity's kind.
     * @param name name of the entity, fully qualified as is used in the definition field.
     * @param entity CSN data belonging to the entity to perform lookups in.
     */
    private visitEntity(name: string, entity: CSN): void;
    private _printEntity(name: string, entity: CSN): void;
    private _printAction(name: string, action: CSN): void;
    private _printType(name: string, type: CSN): void;
    private _printAspect(name: string, aspect: CSN): void;

    /**
     * Visits a single element in an entity.
     * @param name name of the element
     * @param element CSN data belonging to the the element.
     * @param file the namespace file the surrounding entity is being printed into.
     * @param buffer buffer to add the definition to. If no buffer is passed, the passed file's class buffer is used instead.
     */
    public visitElement(name: string, element: CSN, file: SourceFile, buffer?: Buffer): void;

    /**
     * Attempts to retrieve the max cardinality of a CSN for an entity.
     * @param element csn of entity to retrieve cardinality for
     * @returns max cardinality of the element. 
     * If no cardinality is attached to the element, cardinality is 1.
     * If it is set to '*', result is Infinity.
     */
    private getMaxCardinality(element: EntityCSN): number;

    /**
     * Convenience method to shave off the namespace of a fully qualified path.
     * More specifically, only the parts (reading from right to left) that are of
     * kind "entity" are retained.
     * a.b.c.Foo -> Foo
     * Bar -> Bar
     * sap.cap.Book.text -> Book.text (assuming Book and text are both of kind "entity")
     * @param p path
     * @returns the entity name without leading namespace.
     */
    private _trimNamespace(p: string): string;

    /**
     * Resolves a fully qualified identifier to a namespace.
     * In an identifier 'a.b.c.D.E', the namespace is the part of the identifier
     * read from left to right which does not contain a kind 'context' or 'service'.
     * That is, if in the above example 'D' is a context and 'E' is a service,
     * the resulting namespace is 'a.b.c'.
     * @param pathParts the distinct parts of the namespace, i.e. ['a','b','c','D','E']
     * @returns the namespace's name, i.e. 'a.b.c'.
     */
    private _resolveNamespace(pathParts: string[]): string;

    /**
     * Puts a passed string in docstring format.
     * @param doc raw string to docify. May contain linebreaks.
     * @returns an array of lines wrapped in doc format. The result is not
     *          concatenated to be properly indented by `buffer.add(...)`.
     */
    private _docify(doc: string): string[];

    /**
     * Transforms an entity or CDS aspect into a JS aspect (aka mixin).
     * That is, for an element A we get:
     * - the function A(B) to mix the aspect into another class B
     * - the const AXtended which represents the entity A with all of its aspects mixed in (this const is not exported)
     * - the type A to use for external typing and is derived from AXtended.
     * @param name the name of the entity
     * @param element the pointer into the CSN to extract the elements from
     * @param buffer the buffer to write the resulting definitions into
     * @param cleanName the clean name to use. If not passed, it is derived from the passed name instead.
     */
    private _aspectify(name: string, element: CSN, buffer: Buffer, cleanName?: string);

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
     * @param element the CSN element to resolve the type for.
     * @param file source file for context.
     * @returns name of the resolved type
     */
    private resolveAndRequire(element: CSN, file: SourceFile): string; 

    /**
     * Resolves an element's type to either a builtin or a user defined type. 
     * Enriched with additional information for improved printout (see return type).
     * @param element the CSN element to resolve the type for.
     * @param file source file for context.
     * @returns description of the resolved type
     */
    private resolveType(element: CSN, file: SourceFile): TypeResolveInfo;

    /**
     * Resolves the fully qualified name of an entity to its parent entity.
     * _resolveParent(a.b.c.D) -> CSN {a.b.c}
     * @param name fully qualified name of the entity to resolve the parent of.
     * @returns the resolved parent CSN.
     */
    private _resolveParent(name: String): CSN;

    /**
     * Attempts to resolve a type that could reference another type.
     * @param val 
     * @param into see resolveType()
     * @param file only needed as we may call _resolveInlineDeclarationType from here. Will be expelled at some point.
     */
    private _resolvePotentialReferenceType(val: any, into: TypeResolveInfo, file: SourceFile);


    /**
     * Resolves an inline declaration of a type.
     * We can encounter declarations like:
     * 
     * record : array of {
     *   column : String;
     *   data   : String;
     * }
     * 
     * These have to be resolved to a new type.
     * 
     * @param items the properties of the inline declaration.
     * @param into see resolveType()
     * @param relativeToindent the sourcefile in which we have found the reference to the type.
     *  This is important to correctly detect when a field in the inline declaration is referencing
     *  types from the CWD. In that case, we will not add an import for that type and not add a namespace-prefix.
     */
    private _resolveInlineDeclarationType(items: Array<unknown>, into: TypeResolveInfo, relativeTo: SourceFile): void;

    /**
     * Attempts to resolve a string to a type.
     * String is supposed to refer to either a builtin type
     * or any type defined in CSN.
     * @param t fully qualified type, like cds.String, or a.b.c.d.Foo
     * @param into optional dictionary to fill by reference, see resolveType()
     * @returns see resolveType()
     */
    private _resolveTypeName(t: string, into: TypeResolveInfo): TypeResolveInfo;

    /**
     * Wraps type into association to scalar.
     * @param t the singular type name. 
     */
    private _createToOneAssociation(t: string): string;

    /**
     * Wraps type into association to vector.
     * @param t the singular type name. 
     */
    private _createToManyAssociation(t: string): string;

    /**
     * Wraps type into composition of scalar.
     * @param t the singular type name. 
     */
    private _createCompositionOfOne(t: string): string;

    /**
     * Wraps type into composition of vector.
     * @param t the singular type name. 
     */
    private _createCompositionOfMany(t: string): string;
}
