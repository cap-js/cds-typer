const annotation = '@odata.draft.enabled'

/** @typedef {import('./typedefs').resolver.CSN} CSN */
/** @typedef {import('./typedefs').resolver.EntityCSN} EntityCSN */
/** @typedef {import('./typedefs').resolver.ProjectionCSN} ProjectionCSN */
/** @typedef {import('./typedefs').resolver.ViewCSN} ViewCSN */

/**
 * FIXME: this is pretty handwavey: we are looking for view-entities,
 * i.e. ones that have a query, but are not a cds level projection.
 * Those are still not expanded and we have to retrieve their definition
 * with all properties from the inferred model.
 * @param {any} entity - the entity
 * @returns {entity is ViewCSN}
 */
const isView = entity => entity.query && !entity.projection

/**
 * @param {EntityCSN} entity - the entity
 * @returns {entity is ProjectionCSN | ViewCSN}
 */
const isViewOrProjection = entity => Object.hasOwn(entity, 'query') || Object.hasOwn(entity, 'projection')

/**
 * @param {EntityCSN | ProjectionCSN} entity - the entity
 * @returns {entity is ProjectionCSN}
 */
const isProjection = entity => entity.projection

/**
 * @param {EntityCSN} entity - the entity
 * @see isView
 * Unresolved entities have to be looked up from inferred csn.
 */
const isUnresolved = entity => entity._unresolved === true

/**
 * @param {EntityCSN} entity - the entity
 */
const isCsnAny = entity => entity?.constructor?.name === 'any'

/**
 * @param {EntityCSN} entity - the entity
 */
const isDraftEnabled = entity => entity['@odata.draft.enabled'] === true

/**
 * @param {EntityCSN} entity - the entity
 */
const isType = entity => entity?.kind === 'type'

/**
 * @param {EntityCSN} entity - the entity
 */
const isEntity = entity => entity?.kind === 'entity'

/**
 * @param {EntityCSN | undefined} entity - the entity
 * @returns {entity is import("./typedefs").resolver.EnumCSN}
 */
const isEnum = entity => Boolean(entity && Object.hasOwn(entity, 'enum'))

/**
 * Attempts to retrieve the max cardinality of a CSN for an entity.
 * @param {EntityCSN} element - csn of entity to retrieve cardinality for
 * @returns {number} max cardinality of the element.
 * If no cardinality is attached to the element, cardinality is 1.
 * If it is set to '*', result is Infinity.
 */
const getMaxCardinality = element => {
    const cardinality = element?.cardinality?.max ?? '1'
    return cardinality === '*' ? Infinity : parseInt(cardinality)
}

/**
 * @param {EntityCSN} entity - the entity
 */
const getViewTarget = entity => isView(entity)
    ? entity.query?.SELECT?.from?.ref?.[0]
    : undefined

/**
 * @param {EntityCSN} entity - the entity
 * @returns {string | undefined}
 */
const getProjectionTarget = entity => isProjection(entity)
    ? entity.projection?.from?.ref?.[0]
    : undefined

class DraftUnroller {
    /** @type {Set<string>} */
    #positives = new Set()
    /** @type {{[key: string]: boolean}} */
    #draftable = {}
    /** @type {{[key: string]: string}} */
    #projections = {}
    /** @type {EntityCSN[]} */
    #entities = []
    /** @type {CSN | undefined} */
    #csn
    set csn(c) {
        this.#csn = c
        if (c === undefined) return
        this.#entities = Object.values(c.definitions)
        this.#projections = this.#entities.reduce((pjs, entity) => {
            if (isProjection(entity)) {
                // @ts-ignore - we know that entity is a projection here
                pjs[entity.name] = getProjectionTarget(entity)
            }
            return pjs
        }, {})
    }
    get csn() { return this.#csn }

    /**
     * @param {EntityCSN | string} entityOrFq - entity to set draftable annotation for.
     * @param {boolean} value - whether the entity is draftable.
     */
    #setDraftable(entityOrFq, value) {
        const entity = typeof entityOrFq === 'string'
            ? this.#getDefinition(entityOrFq)
            : entityOrFq
        if (!entity) return  // inline definition -- not found in definitions
        entity[annotation] = value
        this.#draftable[entity.name] = value
        if (value) {
            this.#positives.add(entity.name)
        } else {
            this.#positives.delete(entity.name)
        }
    }

    /**
     * @param {EntityCSN | string} entityOrFq - entity to look draftability up for.
     * @returns {boolean}
     */
    #getDraftable(entityOrFq) {
        const entity = typeof entityOrFq === 'string'
            ? this.#getDefinition(entityOrFq)
            : entityOrFq
        // assert(typeof entity !== 'string')
        const name = entity?.name ?? entityOrFq
        // @ts-expect-error - .name not being present means entityOrFq is a string, so name is always a string and therefore a valid index
        return this.#draftable[name] ??= this.#propagateInheritance(entity)
    }

    /**
     * FIXME: could use EntityRepository here
     * @param {string} name - name of the entity.
     * @returns {EntityCSN}
     */
    // @ts-expect-error - poor man's #getDefinitionOrThrow. We are always sure name is a valid key
    #getDefinition(name) { return this.csn?.definitions[name] }

    /**
     * Propagate draft annotations through inheritance (includes).
     * The latest annotation through the inheritance chain "wins".
     * Annotations on the entity itself are always queued last, so they will always be decisive over ancestors.
     * @param {EntityCSN | undefined} entity - entity to pull draftability from its parents.
     */
    #propagateInheritance(entity) {
        if (!entity) return
        /** @type {(boolean | undefined)[]} */
        const annotations = (entity.includes ?? []).map(parent => this.#getDraftable(parent))
        annotations.push(entity[annotation])
        this.#setDraftable(entity, annotations.filter(a => a !== undefined).at(-1) ?? false)
    }

    /**
     * Propagate draft-enablement through projections.
     */
    #propagateProjections() {
        /**
         * @param {string} from - entity to propagate draftability from.
         * @param {string} to - entity to propagate draftability to.
         */
        const propagate = (from, to) => {
            do {
                this.#setDraftable(to, this.#getDraftable(to) || this.#getDraftable(from))
                from = to
                to = this.#projections[to]
            } while (to)
        }

        for (let [projection, target] of Object.entries(this.#projections)) {
            propagate(projection, target)
            propagate(target, projection)
        }
    }

    /**
     * If an entity E is draftable and contains any composition of entities,
     * then those entities also become draftable. Recursively.
     * @param {EntityCSN} entity - entity to propagate all compositions from.
     */
    #propagateCompositions(entity) {
        if (!this.#getDraftable(entity)) return

        for (const comp of Object.values(entity.compositions ?? {})) {
            const target = this.#getDefinition(comp.target)
            const current = this.#getDraftable(target)
            if (!current) {
                this.#setDraftable(target, true)
                this.#propagateCompositions(target)
            }
        }
    }

    /** @param {CSN} csn - the full csn  */
    unroll(csn) {
        this.csn = csn

        // inheritance
        for (const entity of this.#entities) {
            this.#propagateInheritance(entity)
        }

        // transitivity through compositions
        // we have to do this in a second pass, as we only now know which entities are draft-enables themselves
        for (const entity of this.#entities) {
            this.#propagateCompositions(entity)
        }

        this.#propagateProjections()
    }
}

// note to self: following doc uses ＠ homoglyph instead of @, as the latter apparently has special semantics in code listings
/**
 * We are unrolling the @odata.draft.enabled annotations into related entities manually.
 * This includes three scenarios:
 *
 * (a) aspects via `A: B`, where `B` is draft enabled.
 * Note that when an entity extends two other entities of which one has drafts enabled and
 * one has not, then the one that is later in the list of mixins "wins":
 * @param {any} csn - the entity
 * @example
 * ```ts
 * ＠odata.draft.enabled true
 * entity T {}
 * ＠odata.draft.enabled false
 * entity F {}
 * entity A: T,F {}  // draft not enabled
 * entity B: F,T {}  // draft enabled
 * ```
 *
 * (b) Draft enabled projections make the entity we project on draft enabled.
 * @example
 * ```ts
 * ＠odata.draft.enabled: true
 * entity A as projection on B {}
 * entity B {}  // draft enabled
 * ```
 *
 * (c) Entities that are draft enabled propagate this property down through compositions:
 *
 * ```ts
 * ＠odata.draft.enabled: true
 * entity A {
 *   b: Composition of B
 * }
 * entity B {}  // draft enabled
 * ```
 */
function unrollDraftability(csn) {
    new DraftUnroller().unroll(csn)
}

/**
 * Propagates keys elements through the CSN. This includes
 *
 * (a) keys that are explicitly declared as key in an entity
 * (b) keys from aspects the entity extends
 *
 * This explicit propagation is required to add foreign key relations
 * to referring entities.
 * @param {any} csn - the entity
 * @example
 * ```cds
 * entity A: cuid { key name: String; }
 * entity B { ref: Association to one A }
 * ```
 * must yield
 * ```ts
 * class A {
 *   ID: UUID // inherited from cuid
 *   name: String;
 * }
 * class B {
 *   ref: Association.to<A>
 *   ref_ID: UUID
 *   ref_name: String;
 * }
 * ```
 */
function propagateForeignKeys(csn) {
    for (const element of Object.values(csn.definitions)) {
        Object.defineProperty(element, 'keys', {
            get: function () {
                // cached access to all immediately defined _and_ inherited keys.
                // They need to be explicitly accessible in subclasses to generate
                // foreign key fields from Associations/ Compositions.
                if (!Object.hasOwn(this, '__keys')) {
                    const ownKeys = Object.entries(this.elements ?? {}).filter(([,el]) => el.key === true)
                    const inheritedKeys = this.includes?.flatMap((/** @type {string} */ parent) => Object.entries(csn.definitions[parent].keys)) ?? []
                    // not sure why, but .associations contains both Associations, as well as Compositions in CSN.
                    // (.compositions contains only Compositions, if any)
                    const remoteKeys = Object.entries(this.associations ?? {})
                        .filter(([,{key}]) => key)  // only follow associations that are keys, that way we avoid cycles
                        .flatMap(([kname, key]) => Object.entries(csn.definitions[key.target].keys)
                            .map(([ckname, ckey]) => [`${kname}_${ckname}`, ckey]))

                    this.__keys = Object.fromEntries([...ownKeys, ...inheritedKeys, ...remoteKeys]
                        .filter(([,ckey]) => !ckey.target)  // discard keys that are Associations. Those are already part of .elements
                    )
                }
                return this.__keys
            }
        })
    }
}

/**
 *
 * @param {any} csn - complete csn
 */
function amendCSN(csn) {
    unrollDraftability(csn)
    propagateForeignKeys(csn)
}

/**
 * @param {EntityCSN} entity - the entity
 */
const getProjectionAliases = entity => {
    /** @type {Record<string, string[]>} */
    const aliases = {}
    let all = false
    for (const col of entity?.projection?.columns ?? []) {
        if (col === '*') {
            all = true
        } else if (col.ref) {
            (aliases[col.ref[0]] ??= []).push(col.as ?? col.ref[0])
        } else {
            // TODO: error, casting seems to miss ref...
        }
    }
    return { aliases, all }
}

module.exports = {
    amendCSN,
    isView,
    isProjection,
    isViewOrProjection,
    isDraftEnabled,
    isEntity,
    isEnum,
    isUnresolved,
    isType,
    getMaxCardinality,
    getProjectionTarget,
    getProjectionAliases,
    getViewTarget,
    propagateForeignKeys,
    isCsnAny
}
