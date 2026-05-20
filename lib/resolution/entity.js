const { isType } = require('../csn')
const { LOG } = require('../logging')

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

    /** @type {import('./resolver').Inflection | undefined} */
    #inflection

    /** @type {import('./resolver').Resolver} */
    #resolver

    /** @type {EntityRepository} */
    #repository

    /** @type {EntityInfo | null} */
    #parent = null

    /** @type {import('../typedefs').resolver.EntityCSN | undefined} */
    #csn

    /** @type {Set<string> | undefined} */
    #inheritedElements

    /** @type {string | undefined} */
    #aspectIdentifier

    /** @type {EntityInfo[] | undefined} */
    #ancestorInfos

    /** @returns set of inherited elements (e.g. ID of aspect cuid) */
    get inheritedElements() {
        if (this.#inheritedElements) return this.#inheritedElements
        this.#inheritedElements = new Set()
        for (const parentName of this.csn.includes ?? []) {
            const parent = this.#repository.getByFq(parentName)
            for (const element of Object.keys(parent?.csn?.elements ?? {})) {
                this.#inheritedElements.add(element)
            }
        }
        return this.#inheritedElements
    }

    /** @returns the **inferred** csn for this entity. */
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

    get ancestorInfos () {
        return this.#ancestorInfos ??= /**@type{EntityInfo[]}*/((this.csn.includes ?? [])
            .map(fq => this.#repository.getByFq(fq))
            .filter(Boolean))
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
     * The base name to use when generating an aspect function name (`_XxxAspect`).
     * Normally this is `inflection.singular.plain`, but falls back to `entityName` when
     * that would collide with an ancestor's class name.
     * @returns {string}
     */
    get aspectIdentifier () {
        if (this.#aspectIdentifier === undefined) {
            const clean = this.inflection.singular?.plain
            this.#aspectIdentifier = hasAncestralNamingCollision(this.ancestorInfos, clean)
                ? this.entityName
                : clean
        }
        return this.#aspectIdentifier
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
     * @param {import('../components/identifier').Identifier |string} fq - fully qualified name of the entity
     * @returns {EntityInfo | null}
     */
    getByFq (fq) {
        if (typeof fq !== 'string') fq = fq.plain
        if (this.#cache[fq] !== undefined) return this.#cache[fq]
        return this.#cache[fq] = this.#resolver.isPartOfModel(fq)
            ? new EntityInfo(fq, this, this.#resolver)
            : null
    }

    /**
     * Convenience for getByFq when you are 100% sure the entity exists.
     * Serves to eliminate cumbersome null-handling where you know it's not necessary.
     * For example when fq is derived from a reference to another entity.
     * @param {import('../components/identifier').Identifier | string} fq - fully qualified name of the entity
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
 * Qualifies a name with a namespace prefix when the reference crosses a namespace boundary.
 * @param {EntityInfo} info - info
 * @param {string} name - name
 * @param {import('../file').Path | undefined} relative - the path of the referencing file, used to determine whether qualification is needed
 * @returns {string}
 */
function qualify (info, name, relative) {
    return !relative || relative.isCwd(info.namespace.asDirectory())
        ? name
        : `${info.namespace.asIdentifier()}.${name}`
}

/**
 * Builds a reference to an entity's aspect function (e.g. `_BooksAspect` or `_ns._BooksAspect`).
 * Uses the collision-aware {@link EntityInfo#aspectIdentifier} so the name matches the declaration.
 * @param {object} options
 * @param {EntityInfo} options.info
 * @param {function(string): string} options.wrapper - typically `name => \`_${name}Aspect\``
 * @param {import('../file').Path} [options.relative]
 * @returns {string}
 */
function asAspectFnIdentifier ({info, wrapper, relative}) {
    const name = isType(info.csn) ? info.entityName : info.aspectIdentifier
    return qualify(info, wrapper(name), relative)
}

/**
 * Builds a reference to an entity's class (e.g. `Book` or `_ns.Book`).
 * Always uses `inflection.singular.plain` because the exported class is always singular,
 * regardless of whether the aspect function name had a collision.
 * @param {object} options
 * @param {EntityInfo} options.info
 * @param {import('../file').Path} [options.relative]
 * @returns {string}
 */
function asClassIdentifier ({info, relative}) {
    const name = isType(info.csn) ? info.entityName : info.inflection.singular?.plain
    return qualify(info, name, relative)
}

/**
 * Checks whether a candidate name collides with any **direct** ancestor's class name
 * (i.e. entries in `csn.includes`; transitive ancestors are not checked).
 * Used to decide between `entityName` (safe, unique) and `inflection.singular.plain`
 * (preferred) when forming an aspect function name.
 * @param {EntityInfo[]} ancestorInfos - resolved direct ancestor infos
 * @param {string} clean - the candidate name (typically `inflection.singular.plain`)
 * @returns {boolean}
 */
function hasAncestralNamingCollision (ancestorInfos, clean) {

    const collides = ancestorInfos.some(ancestor => {
        const ancestorName = isType(ancestor.csn) ? ancestor.entityName : ancestor.inflection.singular?.plain
        return ancestorName === clean
    })
    if (collides) {
        LOG.debug(`Naming collision detected for entity "${clean}" with one of its ancestors.`)
    }
    return collides
}

/** @typedef {EntityInfo} Info */

module.exports = {
    EntityRepository,
    asAspectFnIdentifier,
    asClassIdentifier,
    hasAncestralNamingCollision
}