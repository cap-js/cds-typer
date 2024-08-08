export module resolver {
    type ref = {
        ref: string[],
        as?: string
    }

    export type PropertyModifier = 'override' | 'declare'

    export type EntityCSN = {
        actions?: OperationCSN[],
        cardinality?: { max?: '*' | string }
        compositions?: { target: string }[]
        doc?: string,
        elements?: { [key: string]: EntityCSN }
        key?: string // custom!!
        keys?: { [key:string]: any }
        kind: string,
        includes?: string[]
        items?: EntityCSN
        notNull?: boolean,  // custom!
        on?: string,
        parent?: EntityCSN
        projection?: { from: ref, columns: (ref | '*')[]}
        target?: string,
        type: string,
        name: string,
        '@odata.draft.enabled'?: boolean // custom!
        _unresolved?: boolean
    }

    export type OperationCSN = EntityCSN & {
        params: {[key:string]: EntityCSN},
        returns?: any,
        kind: 'action' | 'function'
    }

    export type ProjectionCSN = EntityCSN & {
        projection: any
    }

    export type ViewCSN = EntityCSN & {
        query?: any
    }


    export type EnumCSN = EntityCSN & {
        enum: {[key:name]: string}
    }

    export type CSN = {
        definitions: { [key: string]: EntityCSN },
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
        csn?: EntityCSNCSN,
        imports?: Path[]
        inner?: TypeResolveInfo,
        structuredType?: {[key: string]: {typeName: string, typeInfo: TypeResolveInfo}}  // FIXME: same as inner?
        plainName?: string,
        typeName?: string // FIXME: same as plainName?
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

export module util {
    export type Annotations = {
        name?: string,
        '@singular'?: string,
        '@plural'?: string
    }

    export type CommandLineFlags = {
        desc: string,
        default?: any
    }

    export type ParsedFlag = {
        positional: string[],
        named: { [key: string]: any }
    }
}

export module visitor {
    export type CompileParameters = {
        outputDirectory: string,
        logLevel: number,
        jsConfigPath?: string,
        inlineDeclarations: 'flat' | 'structured',
        propertiesOptional: boolean,
        IEEE754Compatible: boolean,
    }

    export type VisitorOptions = {
        /** `propertiesOptional = true` -> all properties are generated as optional ?:. (standard CAP behaviour, where properties be unavailable) */
        propertiesOptional: boolean,
        /**
         * `inlineDeclarations = 'structured'` -> @see {@link inline.StructuredInlineDeclarationResolver}
         * `inlineDeclarations = 'flat'` -> @see {@link inline.FlatInlineDeclarationResolver}
         */
        inlineDeclarations: 'flat' | 'structured',
    }

    export type Inflection = {
        typeName: string,
        singular: string,
        plural: string
    }

    export type Context = {
        entity: string
    }
}

export module file {
    export type Namespace = Object<string, Buffer>
}