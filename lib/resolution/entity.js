const { isType } = require('../csn')

class EntityInfo {
    /**
     * @example
     * ```ts
     * 'n1.n2.A.B.p.q'
     * // v
     * Path(['n1', 'n2'])
     * ```
     * @type {import('../file').Path}
     */
    namespace

    // FIXME: check if scope can actually be more than one entity deep
    /**
     * @example
     * ```ts
     * 'n1.n2.A.B.p.q'
     * // v
     * ['A']
     * ```
     * @type {string[]}
     */
    scope

    /**
     * @example
     * ```ts
     * 'n1.n2.A.B.p.q'
     * // v
     * 'B'
     * ```
     * @type {string}
     */
    entityName

    /**
     * @example
     * ```ts
     * 'n1.n2.A.B.p.q'
     * // v
     * ['p', 'q']
     * ```
     * @type {string[]}
     */
    propertyAccess

    /** @type {{singular: string, plural: string} | undefined} */
    #inflection

    /** @type {import('./resolver').Resolver} */
    #resolver

    /** @type {EntityRepository} */
    #repository

    /** @type {EntityInfo | null} */
    #parent = null

    /** @type {import('../typedefs').resolver.EntityCSN | undefined} */
    #csn

    get csn () {
        return this.#csn ??= this.#resolver.csn.definitions[this.fullyQualifiedName]
    }

    /**
     * @example
     * ```ts
     * 'n1.n2.A.B.p.q'
     * // v
     * { singular: B, plural: Bs }
     * ```
     */
    get inflection () {
        if (!this.#inflection) {
            const dummyTypeInfo = {
                plainName: this.entityName,
                csn: this.csn,
                isInlineDeclaration: false
            }
            const { singular, plural } = this.#resolver.inflect(dummyTypeInfo, this.namespace)
            this.#inflection = { singular, plural }
        }
        return this.#inflection
    }

    /**
     * @example
     * ```ts
     * 'n1.n2.A.B.p.q'
     * // v
     * 'A.B.p.q'
     * ```
     * @type {string}
     */
    get withoutNamespace () {
        return [this.scope, this.entityName, this.propertyAccess].flat().join('.')
    }

    /**
     * @returns {EntityInfo | null}
     */
    get parent () {
        if (this.#parent !== undefined) return this.#parent
        const parentFq = [this.namespace, this.scope].flat().join('.')
        return this.#parent = this.#repository.getByFq(parentFq)
    }

    /**
     * @param {string} fullyQualifiedName - the fully qualified name of the entity
     * @param {EntityRepository} repository - the repository this info is stored in
     * @param {import('./resolver').Resolver} resolver - the resolver
     */
    constructor (fullyQualifiedName, repository, resolver) {
        const untangled = resolver.untangle(fullyQualifiedName)
        this.#repository = repository
        this.#resolver = resolver
        this.fullyQualifiedName = fullyQualifiedName
        this.namespace = untangled.namespace
        this.scope = untangled.scope
        this.entityName = untangled.name
        this.propertyAccess = untangled.property
    }
}

class EntityRepository {
    /** @type {{ [key: string]: EntityInfo | null }} */
    #cache = {}

    /** @type {import('./resolver').Resolver} */
    #resolver

    /**
     * @param {string} fq - fully qualified name of the entity
     * @returns {EntityInfo | null}
     */
    getByFq (fq) {
        if (this.#cache[fq] !== undefined) return this.#cache[fq]
        this.#cache[fq] = this.#resolver.isPartOfModel(fq)
            ? new EntityInfo(fq, this, this.#resolver)
            : null
        return this.#cache[fq]
    }

    /**
     * Convenience for getByFq when you are 100% sure the entity exists.
     * Serves to eliminate cumbersome null-handling where you know it's not necessary.
     * For example when fq is derived from a reference to another entity.
     * @param {string} fq - fully qualified name of the entity
     * @returns {EntityInfo}
     */
    getByFqOrThrow(fq) {
        const entityInfo = this.getByFq(fq)
        if (entityInfo === null) throw new Error(`Entity with fq "${fq}" is not part of the model`)
        return entityInfo
    }

    /**
     * @param {import('./resolver').Resolver} resolver - the resolver
     */
    constructor (resolver) {
        this.#resolver = resolver
    }
}

/**
 * Derives an identifier from an entity info.
 * That identifier can be used to refer to a specific entity within an index.ts file.
 * By passing a relative file, the identifier will be preceeded with a scope if needed.
 * @param {object} options - the options
 * @param {EntityInfo} options.info - the entity info
 * @param {function(string): string} [options.wrapper] - a function to wrap the identifier
 * @param {import('../file').Path} [options.relative] - the path to resolve the identifier relative to
 * @returns {string} the identifier
 */
function asIdentifier ({info, wrapper = undefined, relative = undefined}) {
    const name = isType(info.csn)
        ? info.entityName
        : info.inflection.singular

    const wrapped = typeof wrapper === 'function'
        ? wrapper(name)
        : name
    return !relative || relative.isCwd(info.namespace.asDirectory())
        ? wrapped
        : `${info.namespace.asIdentifier()}.${wrapped}`
}

module.exports = {
    EntityRepository,
    asIdentifier
}