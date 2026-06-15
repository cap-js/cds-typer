'use strict'

const { LOG } = require('./logging')

/** @typedef {import('./typedefs').resolver.CSN} CSN */
/** @typedef {import('./typedefs').resolver.EntityCSN} EntityCSN */
/** @typedef {import('./typedefs').resolver.OperationCSN} OperationCSN */
/** @typedef {keyof import('./typedefs').traverser.EventPayload } TraversalEvent */
/** @typedef {import('./typedefs').traverser.Selector} Selector */
/**
 * @typedef {import('./typedefs').traverser.Handler<T>} Handler
 * @template {TraversalEvent} T
 */

/**
 * Event-driven CSN traverser.
 * Walks through a CSN model and emits events for each definition type.
 */
class CsnTraverser {
    /**
     * @param {CSN} csn - the CSN model to traverse
     */
    constructor(csn) {
        /** @type {CSN} */
        this.csn = csn

        /** @type {Map<Selector, Handler<TraversalEvent>[]>} */
        this.handlers = new Map()
    }

    /**
     * Registers an event handler for a specific CSN definition type.
     * @template {TraversalEvent} T
     * @param {T} event - the event name
     * @param {Handler<T>} handler - the handler function to call when the event is emitted
     * @returns {this} for chaining
     */
    on(event, handler) {
        if (!this.handlers.has(event)) {
            this.handlers.set(event, [])
        }
        // @ts-expect-error - we ensure type safety through T and the above check. But TypeScript cannot infer that.
        (this.handlers.get(event)).push(handler)
        return this
    }

    /**
     * Emits an event to all registered handlers.
     * @template {TraversalEvent} T
     * @param {import('./typedefs').traverser.Selector} event - the event name
     * @param {string} fq - the fully qualified name of the definition
     * @param {import('./typedefs').traverser.EventPayload[T]} definition - the definition data to pass to the handlers
     * @param {import('./typedefs').traverser.HandlerOptions} [options] - additional options for the handler
     */
    #emit(event, fq, definition, options = {}) {
        const handlers = this.handlers.get(event)
        if (!handlers) {
            LOG.debug(`No handlers registered for event '${event}'.`)
            return
        }
        for (const handler of handlers) {
            handler(fq, definition, options)
        }
    }

    /**
     * Traverses all definitions in the CSN model.
     * This is the main entry point for traversal.
     */
    visitDefinitions() {
        for (const [name, entity] of Object.entries(this.csn.definitions ?? {})) {
            this.#visitDefinition(name, entity)
        }
    }

    /**
     * Visits a single definition from the CSN's definition field.
     * Emits events based on the definition's kind.
     * @param {string} fq - fully qualified name of the definition
     * @param {EntityCSN} definition - CSN data belonging to the definition
     */
    #visitDefinition(fq, definition) {
        switch (definition.kind) {
        case 'entity':
            this.#emit('entity', fq, definition)
            break
        case 'action':
        case 'function':
            this.#emit('operation', fq, definition)
            break
        case 'aspect':
            this.#emit('aspect', fq, definition)
            break
        case 'type':
            this.#emit('type', fq, definition)
            break
        case 'event':
            this.#emit('event', fq, definition)
            break
        case 'service':
            this.#emit('service', fq, definition)
            break
        default:
            LOG.debug(`Unhandled definition kind '${definition.kind}'.`)
        }
    }
}

module.exports = {
    CsnTraverser
}
