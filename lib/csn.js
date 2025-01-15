const { LOG } = require('./logging')
const { annotations } = require('./util')

const DRAFT_ENABLED_ANNO = '@odata.draft.enabled'
/** @type {string[]} */
const draftEnabledEntities = []

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
 * @param {string} fq - the fqn of an entity
 */
const isDraftEnabled = fq => draftEnabledEntities.includes(fq)

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

class DraftEnabledEntityCollector {
    /** @type {EntityCSN[]} */
    #draftRoots = []
    /** @type {string[]} */
    #serviceNames = []
    /** @type {CSN | undefined} */
    #csn
    #compileError = false

    /**
     * @returns {string[]}
     */
    #getServiceNames() {
        return Object.values(this.#csn?.definitions ?? {}).filter(d => d.kind === 'service').map(d => d.name)
    }

    /**
     * @returns {EntityCSN[]}
     */
    #collectDraftRoots() {
        return Object.values(this.#csn?.definitions ?? {}).filter(
            d => isEntity(d) && this.#isDraftEnabled(d) && this.#isPartOfAnyService(d.name)
        )
    }

    /**
     * @param {string} entityName - entity to check
     * @returns {boolean} `true` if entity is part an service
     */
    #isPartOfAnyService(entityName) {
        return this.#serviceNames.some(s => entityName.startsWith(s))
    }

    /**
     * Collect all entities that are transitively reachable via compositions from `entity` into `draftNodes`.
     * Check that no entity other than the root node has `@odata.draft.enabled`
     * @param {EntityCSN} entity -
     * @param {string} entityName -
     * @param {EntityCSN} rootEntity - root entity where composition traversal started.
     * @param {Record<string,EntityCSN>} draftEntities - Dictionary of entitys
     */
    #collectDraftEntitiesInto(entity, entityName, rootEntity, draftEntities) {
        draftEntities[entityName] = entity

        for (const elem of Object.values(entity.elements ?? {})) {
            if (!elem.target || elem.type !== 'cds.Composition') continue

            const draftEntity = this.#csn?.definitions[elem.target]
            const draftEntityName = elem.target

            if (!draftEntity) {
                throw new Error(`Expecting target to be resolved: ${JSON.stringify(elem, null, 2)}`)
            }

            if (!this.#isPartOfAnyService(draftEntityName)) {
                LOG.warn(`Ignoring draft entity for composition target ${draftEntityName} because it is not part of a service`)
                continue
            }

            if (draftEntity !== rootEntity && this.#isDraftEnabled(draftEntity)) {
                this.#compileError = true
                LOG.error(`Composition in draft-enabled entity can't lead to another entity with "@odata.draft.enabled" (in entity: "${entityName}"/element: ${elem.name})!`)
                delete draftEntities[draftEntityName]
                continue
            }

            if (!this.#isDraftEnabled(draftEntity) && !draftEntities[draftEntityName]) {
                this.#collectDraftEntitiesInto(draftEntity, draftEntityName, rootEntity, draftEntities)
            }
        }
    }

    /**
     * @param {EntityCSN} entity - entity to check
     * @returns {boolean}
     */
    #isDraftEnabled(entity) {
        return entity[DRAFT_ENABLED_ANNO] === true
    }

    /** @param {CSN} csn - the full csn  */
    run(csn) {
        if (!csn) return

        this.#csn = csn
        this.#serviceNames = this.#getServiceNames()
        this.#draftRoots = this.#collectDraftRoots()

        for (const draftRoot of this.#draftRoots) {
            /** @type {Record<string,EntityCSN>} */
            const draftEntities = {}
            this.#collectDraftEntitiesInto(draftRoot, draftRoot.name, draftRoot, draftEntities)

            for (const draftNode of Object.values(draftEntities)) {
                draftEnabledEntities.push(draftNode.name)
            }
        }
        /**
         * If an unreconcilable draft model error occurred, the whole type generation
         * will be cancelled. This aligns with the behavior of commands like e.g.
         * - cds compile srv -4 odata
         * - cds compile srv -4 sql
         * - cds watch
         */
        if (this.#compileError) throw new Error('Compilation of model failed')
    }
}

// note to self: following doc uses ＠ homoglyph instead of @, as the latter apparently has special semantics in code listings
/**
 * We collect all entities that are draft enabled.
 * (@see `@sap/cds-compiler/lib/transform/draft/db.js#generateDraft`)
 *
 * This includes thwo scenarios:
 *  - (a) Entities that are part of a service and have the annotation ＠odata.draft.enabled
 *  - (b) Entities that are draft enabled propagate this property down through compositions.
 *        NOTE: The compositions themselves must not be draft enabled, otherwise no draft entity will be generated for them
 * @param {any} csn - the entity
 * @example
 * (a)
 * ```cds
 * // service.cds
 * service MyService {
 *   ＠odata.draft.enabled true
 *   entity A {}
 *
 *   ＠odata.draft.enabled true
 *   entity B {}
 * }
 * ```
 * @example
 * (b)
 * ```cds
 * // service.cds
 * service MyService {
 *   ＠odata.draft.enabled: true
 *   entity A {
 *     b: Composition of B
 *   }
 *   entity B {}  // draft enabled
 * }
 * ```
 */
function collectDraftEnabledEntities(csn) {
    new DraftEnabledEntityCollector().run(csn)
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
 * Clears "correct" singular/plural annotations from inferred model
 * copies the ones from the xtended model.
 *
 * This is done to prevent potential duplicate class names because of annotation propagation.
 * @param {{inferred: CSN, xtended: CSN}} csn - CSN models
 */
function propagateInflectionAnnotations(csn) {
    const singularAnno = annotations.singular[0]
    const pluralAnno = annotations.plural[0]
    for (const [name, def] of Object.entries(csn.inferred.definitions)) {
        const xtendedDef = csn.xtended.definitions[name]
        // we keep the annotations from definition specific to the inferred model (e.g. inline compositions)
        if (!xtendedDef) continue

        // clear annotations from inferred definition
        if (Object.hasOwn(def, singularAnno)) delete def[singularAnno]
        if (Object.hasOwn(def, pluralAnno)) delete def[pluralAnno]
        // transfer annotation from xtended if existing
        if (Object.hasOwn(xtendedDef, singularAnno)) def[singularAnno] = xtendedDef[singularAnno]
        if (Object.hasOwn(xtendedDef, pluralAnno)) def[pluralAnno] = xtendedDef[pluralAnno]
    }
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

/**
 * Heuristic way of looking up a reference type.
 * We currently only support up to two segments,
 * the first referring to the entity, a possible second
 * referring to an element of the entity.
 * @param {CSN} csn - CSN
 * @param {string[]} ref - reference
 * @returns {EntityCSN}
 */
function lookUpRefType (csn, ref) {
    if (ref.length > 2) throw new Error(`Unsupported reference type ${ref.join('.')} with ${ref.length} segments. Please report this error.`)
    /** @type {EntityCSN | undefined} */
    let result = csn.definitions[ref[0]]  // entity
    if (ref.length === 1) return result
    result = result?.elements?.[ref[1]]  // property
    if (!result) throw new Error(`Failed to look up reference type ${ref.join('.')}`)
    return result
}

module.exports = {
    collectDraftEnabledEntities,
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
    propagateInflectionAnnotations,
    isCsnAny,
    lookUpRefType
}
