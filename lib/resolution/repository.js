class EntityInfo {
    /**
     * @example
     * ```ts
     * 'n1.n2.A.B.p.q'
     * // v
     * ['n1', 'n2']
     * ```
     * @type {string[]} 
     */
    namespace

    /**
     * @example
     * ```ts
     * 'n1.n2.A.B.p.q'
     * // v
     * 'A'
     * ```
     * @type {string} 
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

    /** @type {{singular: string, plural: string}} */
    #inflection

    /** @type {Resolver} */
    #resolver

    /** @type {EntityRepository} */
    #repository

    /** @type {EntityInfo} */
    #parent

    /** @type {EntityCSN} */
    #csn

    get csn () {
        return this.#csn ??= this.#resolver.csn[this.fullyQualifiedName]
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
        return [this.scope, this.entityName, this.propertyAccess].join('.')
    }

    /**
     * @returns {EntityInfo | null}
     */
    get parent () {
        if (this.#parent !== undefined) return this.#parent
        const parentFq = [this.namespace, this.scope].join('.')
        return this.#parent = this.#repository.getByFq(parentFq)
    }

    /**
     * @param {string} fullyQualifiedName - the fully qualified name of the entity
     * @param {EntityRepository} repository - the repository this info is stored in
     * @param {Resolver} resolver - the resolver
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
    /** @type {{ [key: string]: EntityInfo }} */
    #cache = {}

    /** @type {Resolver} */
    #resolver

    /**
     * @param {string} fq - fully qualified name of the entity
     * @returns {EntityInfo | null}
     */
    getByFq (fq) {
        if (this.#cache[fq] !== undefined) return this.#cache[fq]
        this.#cache[fq] = this.#resolver.existsInCsn(fq)
            ? new EntityInfo(fq, this, this.#resolver)
            : null
        return this.#cache[fq]
    }

    /**
     * @param {Resolver} resolver - the resolver
     */
    constructor (resolver) {
        this.#resolver = resolver
    }
}

module.exports = {
    EntityRepository
}