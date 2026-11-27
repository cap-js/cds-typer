import '@cap-js/cds-types'
import type { csn, linked, ref as CdsRef, val as CdsVal } from '@sap/cds'
import type { Identifier } from './components/identifier'
import type { Buffer, Path } from './file'

export namespace resolver {
    /** Typer resolves CSN references with string path segments, not CQN filters. */
    export type ref = Omit<CdsRef, 'ref'> & {
        ref: string[],
        as?: string
    }

    export type PropertyModifier = 'override' | 'declare'

    /**
     * Central adapter for the linked, inferred and xtended models consumed by typer.
     * cds-types describes all definition kinds as an intersection; most of those
     * properties only exist on some kinds, so they must be optional here.
     * Recursive properties point back to this adapter to retain typer's metadata.
     * Do not augment cds-types globally or add per-consumer CSN overrides.
     */
    export type EntityCSN = Omit<Partial<csn.Definition>,
        'elements' | 'items' | 'keys' | 'type' | 'query' | 'cardinality' | 'kind' | 'on'>
        & Pick<linked.classes.any_, 'name'> & {
        elements?: Record<string, EntityCSN>
        items?: EntityCSN
        /** propagateForeignKeys replaces linked keys with a dictionary. */
        keys?: Record<string, EntityCSN>
        type?: csn.type['type'] | ref
        /** Linked action parameters have kind 'param', missing from csn.kinds. */
        kind?: csn.kinds | 'param'
        cardinality?: Omit<NonNullable<csn.Association['cardinality']>, 'max'> & { max?: number | string }
        /** Older cds-types predicates intersect strings with expression objects. */
        on?: csn.Association['on'] | (ref | CdsVal | string)[]
        key?: csn.EntityElements[string]['key']
        notNull?: csn.EntityElements[string]['notNull']
        parent?: EntityCSN
        actions?: Record<string, OperationCSN>
        operations?: Record<string, OperationCSN>
        compositions?: Record<string, EntityCSN>
        params?: Record<string, EntityCSN>
        returns?: EntityCSN
        /** Added upstream after cds-types 0.9, which is still a supported peer. */
        doc?: string
        /** Projection shorthand and linked queries are not fully covered upstream. */
        projection?: Select
        query?: Omit<NonNullable<csn.entity['query']>, 'SELECT'> & { SELECT?: Select, from?: ref }
        /** CSN enum entries wrap explicit values in { val }; absent values use the name. */
        enum?: Record<string, { val?: string | number | boolean, doc?: EntityCSN['doc'] }>
        '@singular'?: string,
        '@plural'?: string,
        '@mandatory'?: boolean,
        '@odata.draft.enabled'?: boolean
        '@cds.external'?: boolean
        /** Typer-owned metadata, never added to the shared cds-types definitions. */
        _unresolved?: boolean
        isRefNotNull?: boolean
        _targetEntity?: string
        resolvedType?: string
    }

    /** Only reference sources/columns are inspected by typer. */
    type Select = Omit<NonNullable<csn.entity['query']>['SELECT'], 'from' | 'columns'> & {
        from?: ref
        columns?: (ref | '*')[]
    }

    export type OperationCSN = EntityCSN & { kind: Extract<csn.kinds, 'action' | 'function'> }
    export type ProjectionCSN = EntityCSN & Required<Pick<EntityCSN, 'projection'>>
    export type ViewCSN = EntityCSN & Required<Pick<EntityCSN, 'query'>>
    export type EnumCSN = EntityCSN & Required<Pick<EntityCSN, 'enum'>>

    export type CSN = Omit<csn.CSN, 'definitions'> & {
        definitions: Record<string, EntityCSN>
    }

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
        isBuiltin?: boolean,
        isDeepRequire?: boolean,
        isNotNull?: boolean,
        isInlineDeclaration?: boolean,
        isForeignKeyReference?: boolean,
        isArray?: boolean,
        type?: string,
        path?: Path,
        csn?: EntityCSN,
        imports?: Path[]
        inner?: TypeResolveInfo,
        structuredType?: {[key: string]: {typeName: string, typeInfo: TypeResolveInfo}}  // FIXME: same as inner?
        plainName: string,
        typeName?: string // FIXME: same as plainName?
        inflection?: visitor.Inflection
    }

    /** Invariant after resolving a named model/library type, rather than a builtin or inline type. */
    export type NamedTypeResolveInfo = TypeResolveInfo & { csn: EntityCSN, path: Path }

    /**
     * Custom options to be used during type resolvement
     */
    export type TypeResolveOptions = {
        /**
         * Entity elements that have a custom type are not available when entity is accessed using CQL.
         *
         * They only exist in the original defined form in the CSN and LinkedCSN but not in the compiled
         * OData or SQL models (i.e. `cds.compile(..).for.odata()`).
         *
         * Therefore they need to be flattened down like inline structs.
         *
         * ```cds
         * // model.cds
         * type Adress {
         *   street: String;
         *   zipCode: String;
         * }
         * entity Persons {
         *   title: String
         *   address: Adress
         * }
         * ```
         *
         * // service.js
         * ```js
         * const {title, address_street, address_zipCode} = await SELECT.from(Persons);
         * ```
         *
         */
        forceInlineStructs?: boolean
    }

    export type EntityInfo = Exclude<ReturnType<import('../lib/resolution/entity').EntityRepository['getByFq']>, null>

    // TODO: this will be completely replaced by EntityInfo
    export type Untangled = {
        // scope in case the entity is wrapped in another entity `a.b.C.D.E.f.g` -> `[C,D]`
        scope: string[],
        // name name of the leaf entity `a.b.C.D.E.f.g` -> `E`
        name: string,
        // property the property access path `a.b.C.D.E.f.g` -> `[f,g]`
        property: string[],
        // namespace the cds namespace of the entity `a.b.C.D.E.f.g` -> `a.b`
        namespace: Path
    }
}

export namespace util {
    export type Annotations = Pick<resolver.EntityCSN, 'name' | '@singular' | '@plural'>
}

export namespace visitor {
    export type Inflection = {
        typeName?: string,
        singular: Identifier,
        plural: Identifier
    }

    export type Context = {
        entity: Identifier
    }

    export type ParamInfo = {
        name: string,
        modifier: '' | '?',
        type: string,
        doc?: string
    }
}

export namespace traverser {
    export type EventPayload = {
        entity: resolver.EntityCSN,
        operation: resolver.OperationCSN,
        aspect: resolver.EntityCSN,
        type: resolver.EntityCSN,
        event: resolver.EntityCSN,
        service: resolver.EntityCSN
    }

    export type TraversalEvent = keyof EventPayload

    export type Selector = TraversalEvent | `${TraversalEvent}:exit` | `${TraversalEvent} > ${string}`

    export type HandlerOptions = { parent?: object }

    export type Handler<T extends TraversalEvent> =
        (fq: string, definition: EventPayload[T], options?: HandlerOptions) => void
}

export namespace config {
    export namespace cli {
        export type CLIFlags = 'version' | 'help'
        export type ParameterSchema = {
            [key: string]: {
                desc: string,
                allowed?: string[],
                allowedHint?: string,
                type?: 'string' | 'boolean' | 'number',
                default?: string,
                defaultHint?: string,
                postprocess?: (value: string) => any,
                camel?: string,
                snake?: string
                value?: any
            }
        }

        export type ParsedParameters = {
            positional: string[],
            named: { [key: string]: {
                value: any,
                isDefault: boolean,
            } }
        }
    }

    export type Configuration = {
        outputDirectory: string,
        outputDTsFiles: boolean,
        cache: 'none' | 'blake2s256'
        logLevel: number,
        /**
         * `useEntitiesProxy = true` will wrap the `module.exports.<entityName>` in `Proxy` objects
         */
        useEntitiesProxy: boolean,
        jsConfigPath?: string,
        /**
         * `inlineDeclarations = 'structured'` -> @see {@link inline.StructuredInlineDeclarationResolver}
         * `inlineDeclarations = 'flat'` -> @see {@link inline.FlatInlineDeclarationResolver}
         */
        inlineDeclarations: 'flat' | 'structured',
        /** `propertiesOptional = true` -> all properties are generated as optional ?:. (standard CAP behaviour, where properties be unavailable) */
        propertiesOptional: boolean,
        /**
         * `IEEE754Compatible = true` -> any cds.Decimal will become `number | string`
         */
        IEEE754Compatible: boolean
        targetModuleType: 'cjs' | 'esm' | 'auto'
        /**
         * `legacyBinaryTypes = true` -> Binary and LargeBinary are generated as `string` and a union type respectively
         */
        legacyBinaryTypes: boolean
        /** `brandedPrimitiveTypes = true` -> all generated primitive types will be branded */
        brandedPrimitiveTypes: boolean
    }
}

export namespace file {
    export type Namespace = Record<string, Buffer>
}

export namespace printer {
    /**
     * Context object containing all data that may be needed for printing TypeScript output.
     * Different printers can use different subsets of this context.
     * As the output can be vastly different, we intentionally pass a rich context.
     */
    export interface PrintContext {
        /** The name of the aspect function to print */
        aspectFunctionName?: string
        /** The cleaned name of the aspect */
        clean?: string
        /** Entity CSN definition */
        entity?: resolver.EntityCSN
        /** List of ancestor entity infos */
        ancestorInfos?: resolver.EntityInfo[]
        /** Function to derive the aspect function identifier from a name */
        identAspect?: (name: string) => string
        /** The file path, used for qualifying relative references */
        filePath?: import('./file').Path
        /** Buffer containing instance properties */
        properties?: Buffer
        /** Buffer containing static members */
        staticMembers?: Buffer
        /** Buffer containing keys, elements, and actions */
        keysElementsActions?: Buffer
        /** Whether the aspect is being printed inside a namespace */
        isInNamespace?: boolean
        /** The complete body content (for printAspectFunction) */
        body?: string | string[]
    }

    /**
     * Context object for printing enum constants.
     */
    export interface EnumPrintContext {
        /** The name of the enum */
        name: string
        /** Key-value pairs for the enum */
        kvs: [string, string][]
        /** Whether the enum should be exported */
        isExported: boolean
    }
}
