'use strict'

const util = require('../util')
// eslint-disable-next-line no-unused-vars
const { Buffer, SourceFile, Path, Library } = require('../file')
const { deepRequire, createToManyAssociation, createToOneAssociation, createArrayOf, createCompositionOfMany, createCompositionOfOne } = require('./wrappers')
const { StructuredInlineDeclarationResolver } = require('./inline')
const { isInlineEnumType, propertyToInlineEnumName } = require('./enum')
const { isReferenceType } = require('./reference')
const { isEntity } = require('../csn')
const { baseDefinitions } = require('./basedefs')

/** @typedef {import('../visitor').Visitor} Visitor */
/** @typedef {import('../typedefs').resolver.CSN} CSN */
/** @typedef {import('../typedefs').resolver.TypeResolveInfo} TypeResolveInfo */

class BuiltinResolver {
    /**
     * Builtin types defined by CDS.
     */
    #builtins = {
        UUID: 'string',
        String: 'string',
        Binary: 'string',
        LargeString: 'string',
        LargeBinary: 'Buffer | string | {value: import("stream").Readable, $mediaContentType: string, $mediaContentDispositionFilename?: string, $mediaContentDispositionType?: string}',
        Vector: 'string',
        Integer: 'number',
        UInt8: 'number',
        Int16: 'number',
        Int32: 'number',
        Int64: 'number',
        Integer64: 'number',
        Decimal: 'number',
        DecimalFloat: 'number',
        Float: 'number',
        Double: 'number',
        Boolean: 'boolean',
        // note: the date-related types are strings on purpose, which reflects their runtime behaviour
        Date: '__.CdsDate',  // yyyy-mm-dd
        DateTime: '__.CdsDateTime', // yyyy-mm-dd + time + TZ (precision: seconds)
        Time: '__.CdsTime',  // hh:mm:ss
        Timestamp: '__.CdsTimestamp', // yyy-mm-dd + time + TZ (ms precision)
        //
        Composition: 'Array',
        Association: 'Array'
    }

    constructor ({ IEEE754Compatible } = {}) {
        if (IEEE754Compatible) {
            this.#builtins.Decimal = '(number | string)'
            this.#builtins.DecimalFloat = '(number | string)'
            this.#builtins.Float = '(number | string)'
            this.#builtins.Double = '(number | string)'
        }
        this.#builtins = Object.freeze(this.#builtins)
    }

    /**
     * @param {string | string[]} t - name or parts of the type name split on dots
     * @returns {string | undefined | false} if t refers to a builtin, the name of the corresponding TS type is returned.
     *   If t _looks like_ a builtin (`cds.X`), undefined is returned.
     *   If t is obviously not a builtin, false is returned.
     */
    resolveBuiltin (t) {
        if (!Array.isArray(t) && typeof t !== 'string') return false
        const path = Array.isArray(t) ? t : t.split('.')
        return path.length === 2 && path[0] === 'cds'
            ? this.#builtins[path[1]]
            : false
    }
}

class Resolver {

    #caches = {
        /**
         * @type {{ [qualifier: string]: string }}
         */
        namespaces: {},
        /**
         * @type {{ [qualifier: string]: string[] }}
         */
        propertyAccesses: {}
    }

    /**
     * @param {string} qualifier
     * @returns {string?}
     */
    #getCachedNamespace (qualifier) {
        return this.#caches.namespaces[qualifier]
    }

    /**
     * @param {string} qualifier
     * @param {string} namespace
     */
    #cacheNamespace (qualifier, namespace) {
        this.#caches.namespaces[qualifier] = namespace
    }

    /**
     * @param {string} qualifier
     * @returns {string[]?}
     */
    #getCachedPropertyAccess (qualifier) {
        return this.#caches.propertyAccesses[qualifier]
    }

    /**
     * @param {string} qualifier
     * @param {string[]} propertyAccess
     */
    #cachePropertyAccess (qualifier, propertyAccess) {
        this.#caches.propertyAccesses[qualifier] = propertyAccess
    }

    get csn() { return this.visitor.csn.inferred }
    
    /** @param {Visitor} visitor */
    constructor(visitor) {
        /** @type {Visitor} */
        this.visitor = visitor

        /** @type {BuiltinResolver} */
        this.builtinResolver = new BuiltinResolver(visitor.options)

        /** @type {Library[]} */
        this.libraries = [new Library(require.resolve('../../library/cds.hana.ts'))]

        /**
         * @type {StructuredInlineDeclarationResolver}
         * needed for inline declarations
         */
        this.structuredInlineResolver = new StructuredInlineDeclarationResolver(this.visitor)
    }   
    
    /**
     * Returns all libraries that have been referenced at least once.
     * @returns {Library[]}
     */
    getUsedLibraries() {
        return this.libraries.filter(l => l.referenced)
    }

    /**
     * TODO: this should probably be a class where we can also cache the properties
     * and only retrieve them on demand
     * @typedef {object} Untangled 
     * @property {string[]} scope in case the entity is wrapped in another entity `a.b.C.D.E.f.g` -> `[C,D]`
     * @property {string} name name of the leaf entity `a.b.C.D.E.f.g` -> `E`
     * @property {string[]} property the property access path `a.b.C.D.E.f.g` -> `[f,g]`
     * @property {Path} namespace the cds namespace of the entity `a.b.C.D.E.f.g` -> `a.b`
     */

    /**
     * Conveniently combines resolveNamespace and trimNamespace
     * to end up with both the resolved Path of the namespace,
     * and the clean name of the class.
     * @param {string} fq - the fully qualified name of an entity.
     * @returns {Untangled} untangled qualifier
     */
    untangle(fq) {
        const builtin = this.builtinResolver.resolveBuiltin(fq)
        if (builtin) return { namespace: new Path([]), name: builtin, property: [], scope: [] }

        const ns = this.resolveNamespace(fq)
        const nameAndProperty = this.trimNamespace(fq)
        const property = this.findPropertyAccess(fq)
        const nameParts = (property.length
            ? nameAndProperty.slice(0, -(property.join('').length + property.length)) // +1 for each dot
            : nameAndProperty
        ).split('.')//.at(-1)  // nested entities would return Foo.Bar, so we only take the last part to get the actual entity name
        return { 
            namespace: new Path(ns.split('.')),
            scope: nameParts.slice(0, -1),
            name: nameParts.at(-1),
            property
        }
    }

    /**
     * Convenience method to shave off the namespace of a fully qualified path.
     * More specifically, only the parts (reading from right to left) that are of
     * kind "entity" or something similar are retained.
     * a.b.c.Foo -> Foo
     * Bar -> Bar
     * sap.cap.Book.text -> Book.text (assuming Book and text are both of kind "entity")
     * @param {string} p - path
     * @returns {string} the entity name without leading namespace.
     */
    trimNamespace(p) {
        //if (this.#getCachedNamespace(p)) return this.#getCachedNamespace(p)
        const parts = p.split('.')
        if (parts.length <= 1) return p

        // start on right side, go up while we have an entity at hand
        // we cant start on left side, as that clashes with undefined entities like "sap"
        const defs = this.csn.definitions
        let qualifier = parts.join('.')
        while (defs[qualifier] && ['entity', 'type', 'aspect', 'event'].includes(defs[qualifier].kind)) {
            parts.pop()
            qualifier = parts.join('.')
        }

        return qualifier ? p.substring(qualifier.length + 1) : p
    }

    /**
     * From a fully qualified path, finds the parts that are property accesses.
     * This are specifically used in CDS' `typeof` syntax, where a property can
     * refer to another entity's property type.
     * @param {string} p - path
     * @example
     * ```
     * namespace namespace;
     * entity Entity {
     *   x: Composition of { y: Composition of z: { a: Integer }}
     * }
     * 
     * // somewhere else
     * entity Foo {
     *   x: namespace.Entity.x.y.z;
     * }
     * ```
     * @example 
     * ```js
     * findPropertyAccess('namespace') // []
     * findPropertyAccess('namespace.Entity') // []
     * findPropertyAccess('namespace.Entity.x') // ['x']
     * findPropertyAccess('namespace.Entity.x.y.z') // ['x', 'y', 'z']
     * ```
     */
    findPropertyAccess(p) {
        if (this.#getCachedPropertyAccess(p)) return this.#getCachedPropertyAccess(p)
        const parts = p.split('.')
        if (parts.length <= 1) return []

        const isPropertyOf = (property, entity) => entity && property && Object.hasOwn(entity?.elements, property)

        const defs = this.visitor.csn.inferred.definitions
        // assume parts to contain [Namespace, Service, Entity1, Entity2, Entity3, property1, property2]
        let qualifier = parts.shift()
        // find first entity from left (Entity1)
        while ((!defs[qualifier] || !isEntity(defs[qualifier])) && parts.length) {
            qualifier += `.${parts.shift()}`
        }
        // skip forward to the last entity from left (Entity3), assuming that there is no name conflict between entities and properties
        // i.e.: if there is a property "Entity2" in the entity Entity1, this will instead [Entity2, Entity3, property1, property2] as property access 
        while (!isPropertyOf(parts[0], defs[qualifier]) && isEntity(defs[qualifier + `.${parts[0]}`])) {
            qualifier += `.${parts.shift()}`
        }
        // assuming Entity3 _does_ own a property "property1", return [property1, property2]
        const propertyAccess = isPropertyOf(parts[0], defs[qualifier]) ? parts : []
        this.#cachePropertyAccess(p, propertyAccess)
        return propertyAccess
    }

    /**
     * Generates singular and plural inflection for the passed type.
     * Several cases are covered here:
     * - explicit annotation by the user in the CSN
     * - implicitly derived inflection based on simple grammar rules
     * - collisions between singular and plural name (resolved by appending a '_' suffix)
     * - type definitions, which are not inflected
     * - inline type definitions, which don't really have a linguistic plural,
     *   but need to expressed as array type to be consumable by the likes of Composition.of.many<T>
     * @param {import('./resolver').TypeResolveInfo} typeInfo - information about the type gathered so far.
     * @param {string} [namespace] - namespace the type occurs in. If passed, will be shaved off from the name
     * @returns {Inflection}
     */
    inflect(typeInfo, namespace) {
        // TODO: handle builtins here as well?
        // guard: types don't get inflected
        if (typeInfo.csn?.kind === 'type') {
            return { 
                singular: typeInfo.plainName,
                plural: createArrayOf(typeInfo.plainName),
                typeName: typeInfo.plainName,
            }
        }

        let typeName
        let singular
        let plural

        if (typeInfo.isInlineDeclaration) {
            // if we detected an inline declaration, we take a quick detour via an InlineDeclarationResolver
            // to rectify the typeName (which would be just '{' elsewise).
            // The correct typename in string form is required in stringifyLambda(...)
            // Note that whenever the typeName is relevant, it is assumed to be in structured form
            // (i.e. a struct), so we always use a StructuredInlineDeclarationResolver here, regardless of
            // what is configured for nested declarations in the visitor.
            // FIXME: in most other places where we have an inline declaration, we actually don't need the typeName.
            // If stringifyLambda(...) is the only place where we need this, we should have stringifyLambda call this
            // piece of code instead to reduce overhead.
            const into = new Buffer()
            this.structuredInlineResolver.printInlineType(undefined, { typeInfo }, into, '')
            typeName = into.join(' ')
            singular = typeName
            plural = createArrayOf(typeName)
        } else {
            // TODO: make sure the resolution still works. Currently, we only cut off the namespace!
            plural = util.getPluralAnnotation(typeInfo.csn) ?? typeInfo.plainName
            singular = util.getSingularAnnotation(typeInfo.csn) ?? util.singular4(typeInfo.csn, true) // util.singular4(typeInfo.csn, true)  // can not use `plural` to honor possible @singular annotation

            // don't slice off namespace if it isn't part of the inflected name.
            // This happens when the user adds an annotation and singular4 therefore
            // already returns an identifier without namespace. Plural has ns already sliced off.
            if (namespace && singular.startsWith(namespace+'.')) {
                singular = singular.slice(namespace.length + 1)
            }

            if (singular === plural) {
                // same as when creating the entity
                plural += '_'
            }
        }
        if (!singular || !plural) {
            this.visitor.logger.error(`Singular ('${singular}') or plural ('${plural}') for '${typeName}' is empty.`)
        }

        return { typeName, singular, plural }
    }

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
     * @param {CSN} element - the CSN element to resolve the type for.
     * @param {SourceFile} file - source file for context.
     * @returns {{typeName: string, typeInfo: TypeResolveInfo & { inflection: Inflection } }} info about the resolved type
     */
    resolveAndRequire(element, file) {
        const typeInfo = this.resolveType(element, file)
        const cardinality = this.getMaxCardinality(element)

        let typeName = typeInfo.plainName ?? typeInfo.type

        // only applies to builtin types, because the association/ composition _themselves_ are the (builtin) types we are checking, not their generic parameter!
        if (typeInfo.isBuiltin === true) {
            const [toOne, toMany] =
                {
                    Association: [createToOneAssociation, createToManyAssociation],
                    Composition: [createCompositionOfOne, createCompositionOfMany],
                    array: [createArrayOf, createArrayOf]
                }[element.constructor.name] ?? []

            if (toOne && toMany) {
                const target = element.items ?? (typeof element.target === 'string' ? { type: element.target } : element.target)
                /** set `notNull = true` to avoid repeated `| not null` TS construction */
                target.notNull = true
                const targetTypeInfo = this.resolveAndRequire(target, file)
                if (targetTypeInfo.typeInfo.isDeepRequire === true) {
                    typeName = cardinality > 1 ? toMany(targetTypeInfo.typeName) : toOne(targetTypeInfo.typeName)
                } else {
                    let { singular, plural } = targetTypeInfo.typeInfo.inflection

                    // FIXME: super hack!!
                    // Inflection currently does not retain the scope of the entity.
                    // But we can't just fix it in inflection(...), as that would break several other things
                    // So we bandaid-fix it back here, as it is the least intrusive place -- but this should get fixed asap!
                    if (target.type) {
                        const untangled = this.untangle(target.type)
                        const scope = untangled.scope.join('.')
                        if (scope && !singular.startsWith(scope)) {
                            singular = `${scope}.${singular}`
                        }
                    }

                    typeName = cardinality > 1 
                        ? toMany(plural)
                        : toOne(this.visitor.isSelfReference(target) ? 'this' : singular)
                    file.addImport(baseDefinitions.path)
                }
            }
        } else {
            // TODO: this could go into resolve type
            // resolve and maybe generate an import.
            // Inline declarations don't have a corresponding path, etc., so skip those.
            if (typeInfo.isInlineDeclaration === false) {
                const namespace = this.resolveNamespace(typeInfo.path.parts)
                const parent = new Path(namespace.split('.')) //t.path.getParent()
                typeInfo.inflection = this.inflect(typeInfo, namespace)

                if (!parent.isCwd(file.path.asDirectory())) {
                    file.addImport(parent)
                    // prepend namespace
                    typeName = `${parent.asIdentifier()}.${typeName}`
                    typeInfo.inflection.singular = `${parent.asIdentifier()}.${typeInfo.inflection.singular}`
                    typeInfo.inflection.plural = `${parent.asIdentifier()}.${typeInfo.inflection.plural}`
                }

                if (element.type.ref?.length > 1) {
                    const [, ...members] = element.type.ref
                    const lookup = this.visitor.inlineDeclarationResolver.getTypeLookup(members)
                    typeName = deepRequire(typeInfo.inflection.singular, lookup)
                    typeInfo.isDeepRequire = true
                    file.addImport(baseDefinitions.path)
                }
            }
            // FIXME NOW: inline declarations, aka structs go here!

            for (const imp of typeInfo.imports ?? []) {
                if (!imp.isCwd(file.path.asDirectory())) {
                    file.addImport(imp)
                }
            }
        }

        if (typeInfo.isInlineDeclaration === true) {
            typeInfo.inflection = this.inflect(typeInfo)
        }

        // handle typeof (unless it has already been handled above)
        const target = element.target?.name ?? element.type?.ref?.join('.') ?? element.type
        if (target && !typeInfo.isDeepRequire) {
            const { property: propertyAccess } = this.untangle(target)
            if (propertyAccess.length) {
                const element = target.slice(0, -propertyAccess.join('.').length - 1)
                const access = this.visitor.inlineDeclarationResolver.getTypeLookup(propertyAccess)
                // singular, as we have to access the property of the entity
                typeName = deepRequire(util.singular4(element)) + access
                typeInfo.isDeepRequire = true          
            }
        }

        // add fallback inflection. Mainly needed for array-of with builtin types.
        // (array-of relies on inflection being present, which is not the case in builtin)
        typeInfo.inflection ??= {
            singular: typeName,
            plural: typeName
        }

        // FIXME: typeName could probably just become part of typeInfo
        return { typeName, typeInfo }
    }

    /**
     * Attempts to retrieve the max cardinality of a CSN for an entity.
     * @param {EntityCSN} element - csn of entity to retrieve cardinality for
     * @returns {number} max cardinality of the element.
     * If no cardinality is attached to the element, cardinality is 1.
     * If it is set to '*', result is Infinity.
     */
    getMaxCardinality(element) {
        const cardinality = element?.cardinality?.max ?? 1
        return cardinality === '*' ? Infinity : parseInt(cardinality)
    }

    /**
     * Resolves the fully qualified name of an entity to its parent entity.
     * resolveParent(a.b.c.D) -> CSN {a.b.c}
     * @param {string} name - fully qualified name of the entity to resolve the parent of.
     * @returns {CSN} the resolved parent CSN.
     */
    resolveParent(name) {
        return this.csn.definitions[name.split('.').slice(0, -1).join('.')]
    }

    /**
     * Resolves a fully qualified identifier to a namespace.
     * In an identifier 'a.b.c.D.E', the namespace is the part of the identifier
     * read from left to right which does not contain a kind 'context' or 'service'.
     * That is, if in the above example 'D' is a context and 'E' is a service,
     * the resulting namespace is 'a.b.c'.
     * @param {string[] | string} pathParts - the distinct parts of the namespace, i.e. ['a','b','c','D','E'] or a single path interspersed with periods
     * @returns {string} the namespace's name, i.e. 'a.b.c'.
     */
    resolveNamespace(pathParts) {
        if (typeof pathParts === 'string') pathParts = pathParts.split('.')
        const fq = pathParts.join('.')
        if (this.#getCachedNamespace(fq)) return this.#getCachedNamespace(fq)
        let result
        while (result === undefined) {
            const path = pathParts.join('.')
            const def = this.csn.definitions[path]
            if (!def) {
                result = path
            } else if (['context', 'service'].includes(def.kind)) {
                result = path
            } else {
                pathParts = pathParts.slice(0, -1)
            }
        }
        this.#cacheNamespace(fq, result)
        return result
    }

    /**
     * Resolves an element's type to either a builtin or a user defined type.
     * Enriched with additional information for improved printout (see return type).
     * @param {CSN} element - the CSN element to resolve the type for.
     * @param {SourceFile} file - source file for context.
     * @returns {TypeResolveInfo} description of the resolved type
     */
    resolveType(element, file) {
        // while resolving inline declarations, it can happen that we land here
        // with an already resolved type. In that case, just return the type we have.
        if (element && Object.hasOwn(element, 'isBuiltin')) return element

        const cardinality = this.getMaxCardinality(element)

        const result = {
            isBuiltin: false, // will be rectified in the corresponding handlers, if needed
            isInlineDeclaration: false,
            isForeignKeyReference: false,
            isArray: false,
            isNotNull: element?.isRefNotNull !== undefined 
                ? element?.isRefNotNull 
                : element?.key || element?.notNull || cardinality > 1,
        }

        if (element?.type === undefined) {
            // "fallback" type "empty object". May be overriden via #resolveInlineDeclarationType
            // later on with an inline declaration
            result.type = '{}'
            result.isInlineDeclaration = true
        } else if (!isReferenceType(element) && isInlineEnumType(element, this.csn)) {
            // element.parent is only set if the enum is attached to an entity's property.
            // If it is missing then we are dealing with an inline parameter type of an action.
            // Edge case: element.parent is set, but no .name property is attached. This happens
            // for inline enums inside types:
            // ```cds
            // type T {
            //   x : String enum { ... };  // no element.name for x
            // }
            // ```
            // In that case, we currently resolve to the more general type (cds.String, here)
            if (element.parent?.name) {
                result.isInlineDeclaration = true
                // we use the singular as the initial declaration of these enums takes place
                // while defining the singular class. Which therefore uses the singular over the plural name.
                const cleanEntityName = util.singular4(element.parent, true)
                const enumName = propertyToInlineEnumName(cleanEntityName, element.name)
                result.type = enumName
                result.plainName = enumName
            } else {
                // FIXME: this is the case where users have arrays of enums as action parameter type.
                // Instead of building the proper type (e.g. `'A' | 'B' | ...`, we are instead building
                // the encasing type (e.g. `string` here)
                // We should instead aim for a proper type, i.e. 
                // this.#resolveInlineDeclarationType(element.enum, result, file)
                // or
                // stringifyEnumType(csnToEnumPairs(element))
                this.#resolveTypeName(element.type, result)
            }
        } else {
            this.resolvePotentialReferenceType(element.type, result, file)
        }            

        // objects and arrays
        if (element?.items) {
            result.isArray = true
            // TODO: re-implement this line once {element.notNull} will be provided for array-like elements
            result.isNotNull = true
            result.isBuiltin = true
            this.resolveType(element.items, file)
            //delete element.items
        } else if (element?.elements && !element?.type) {
            // explicitly skip named type definitions, which have elements too, but should not be considered inline declarations
            this.#resolveInlineDeclarationType(element.elements, result, file)
        }

        if (result.isBuiltin === false && result.isInlineDeclaration === false && !result.plainName) {
            this.logger.warning(`Plain name is empty for ${element?.type ?? '<empty>'}. This will probably cause issues.`)
        }
        return result
    }

    /**
     * Resolves an inline declaration of a type.
     * We can encounter declarations like:
     *
     * record : array of {
     * column : String;
     * data   : String;
     * }
     *
     * These have to be resolved to a new type.
     * @param {any[]} items - the properties of the inline declaration.
     * @param {TypeResolveInfo} into - @see resolveType()
     * @param {SourceFile} relativeTo - the sourcefile in which we have found the reference to the type.
     *  This is important to correctly detect when a field in the inline declaration is referencing
     *  types from the CWD. In that case, we will not add an import for that type and not add a namespace-prefix.
     */
    #resolveInlineDeclarationType(items, into, relativeTo) {
        return this.visitor.inlineDeclarationResolver.resolveInlineDeclaration(items, into, relativeTo)
    }

    /**
     * Attempts to resolve a type that could reference another type.
     * @param {?} val
     * @param {TypeResolveInfo} into - see resolveType()
     * @param {SourceFile} file - only needed as we may call #resolveInlineDeclarationType from here. Will be expelled at some point.
     */
    resolvePotentialReferenceType(val, into, file) {
        // FIXME: get rid of file parameter! it is only used to pass to #resolveInlineDeclarationType
        if (val.elements) {
            this.#resolveInlineDeclarationType(val, into, file) // FIXME INDENT!
        } else if (val.constructor === Object && 'ref' in val) {
            this.#resolveTypeName(val.ref[0], into)
            into.isForeignKeyReference = true
        } else {
            // val is string
            this.#resolveTypeName(val, into)
        }
    }

    /**
     * Attempts to resolve a string to a type.
     * String is supposed to refer to either a builtin type
     * or any type defined in CSN.
     * @param {string} t - fully qualified type, like cds.String, or a.b.c.d.Foo
     * @param {TypeResolveInfo} into - optional dictionary to fill by reference, see resolveType()
     * @returns @see resolveType
     */
    #resolveTypeName(t, into) {
        const result = into || {}
        const path = t.split('.')
        const builtin = this.builtinResolver.resolveBuiltin(path)
        if (builtin === undefined) {
            // looks like builtin, but isn't
            throw new Error(`Can not resolve apparent builtin type '${t}' to any CDS type.`)
        } else if (builtin !== false) {
            // builtin
            result.type = builtin
            result.isBuiltin = true
        } else if (t in this.csn.definitions) {
            // user-defined type
            result.type = this.trimNamespace(util.singular4(this.csn.definitions[t])) //(path[path.length - 1])
            result.isBuiltin = false
            result.path = new Path(path) // FIXME: relative to current file
            result.csn = this.csn.definitions[t]
            result.plainName = this.trimNamespace(t)
        } else if (t === '$self') {
            result.type = 'this'
            result.isBuiltin = true
            result.plainName = 'this'
        } else {
            // type offered by some library
            const lib = this.libraries.find(lib => lib.offers(t))
            if (lib) {
                // only use the last name of the (fully qualified) type name in this case.
                // We can not use trimNamespace, as that actually does a semantic lookup within the CSN.
                // But entities that are found in libraries are not part of that CSN and have therefore be
                // separated from their namespace in a more barbarian way.
                // Luckily, this is not an issue, as libraries are supposed to be flat. So we can assume the
                // last portion of the type to refer to the entity.
                // We use this plain name as type name because consider:
                //
                // ```cds
                // entity Book { title: hana.VARCHAR }
                // ```
                //
                // ```ts
                // import * as _cds_hana from '../../cds/hana'
                // class Book { title: _cds_hana.cds.hana.VARCHAR }  // <- how it would be without discarding the namespace
                // class Book { title: _cds_hana.VARCHAR } // <- how we want it to look
                // ```
                const plain = t.split('.').at(-1)
                lib.referenced = true
                result.type = plain
                result.isBuiltin = false
                result.path = lib.path
                result.csn = { name: t }
                result.plainName = plain
            } else {
                throw new Error(`Can not resolve '${t}' to any builtin, library-, or user defined type.`)
            }
        }

        return result
    }
}

module.exports = {
    Resolver
}