const annotation = '@odata.draft.enabled'

class DraftUnroller {
    /** @type {Set<string>} */
    #positives = new Set()
    /** @type {{[key: string]: boolean}} */
    #draftable = {}
    /** @type {{[key: string]: string}} */
    #projections 
    /** @type {object[]} */
    #entities
    #csn
    set csn(c) {
        this.#csn = c
        this.#entities = Object.values(c.definitions)
        this.#projections = this.#entities.reduce((pjs, entity) => {
            if (entity.projection) {
                pjs[entity.name] = entity.projection.from.ref[0]
            }
            return pjs
        }, {})
    }
    get csn() { return this.#csn }

    /**
     * @param entity {object | string} - entity to set draftable annotation for.
     * @param value {boolean} - whether the entity is draftable.
     */
    #setDraftable(entity, value) { 
        if (typeof entity === 'string') entity = this.#getDefinition(entity)
        entity[annotation] = value
        this.#draftable[entity.name] = value
        if (value) {
            this.#positives.add(entity.name)
        } else {
            this.#positives.delete(entity.name)
        }
    }

    /**
     * @param entity {object | string} - entity to look draftability up for.
     * @returns {boolean}
     */
    #getDraftable(entity) { 
        if (typeof entity === 'string') entity = this.#getDefinition(entity)
        return this.#draftable[entity.name] ??= this.#propagateInheritance(entity) 
    }

    /**
     * @param name {string} - name of the entity.
     */
    #getDefinition(name) { return this.csn.definitions[name] }

    /**
     * Propagate draft annotations through inheritance (includes).
     * The latest annotation through the inheritance chain "wins".
     * Annotations on the entity itself are always queued last, so they will always be decisive over ancestors.
     * 
     * @param entity {object} - entity to pull draftability from its parents.
     */
    #propagateInheritance(entity) {
        const annotations = (entity.includes ?? []).map(parent => this.#getDraftable(parent))
        annotations.push(entity[annotation])
        this.#setDraftable(entity, annotations.filter(a => a !== undefined).at(-1) ?? false)
    }

    /**
     * Propagate draft-enablement through projections.
     */
    #propagateProjections() {
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
     * 
     * @param entity {object} - entity to propagate all compositions from.
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
 * @example sdasd
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

module.exports = { unrollDraftability }