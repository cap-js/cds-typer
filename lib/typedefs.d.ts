export module resolver {
    export type EntityCSN = {
        cardinality?: { max?: '*' | number }
    }

    export type CSN = {
        definitions?: { [key: string]: EntityCSN }
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
        isBuiltin: boolean,
        isDeepRequire: boolean,
        isNotNull: boolean,
        isInlineDeclaration: boolean,
        isForeignKeyReference: boolean,
        isArray: boolean,
        type: string,
        path?: Path,
        csn?: CSN,
        imports: Path[]
        inner: TypeResolveInfo
    }

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