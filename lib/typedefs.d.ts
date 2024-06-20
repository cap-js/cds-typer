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
        propertiesOptional: boolean,
        inlineDeclarations: 'flat' | 'structured',
    }

    export type Inflection = {
        typeName: string,
        singular: string,
        plural: string
    }
}

export module file {
    export type Namespace = Object<string, Buffer>
}