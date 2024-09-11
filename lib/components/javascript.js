/* eslint-disable no-undef */
// this function will be stringified as part of the generated types and is not supposed to be used internally
// @ts-nocheck
const proxyAccessFunction = function (fqParts, opts = {}) {
    const { target, customProps } = { target: {}, customProps: [], ...opts }
    const fq = fqParts.join('.')
    return new Proxy(target, {
        get: function (target, prop) {
            if (cds.entities) {
                target.__proto__ = cds.entities[fq]
                // overwrite/simplify getter after cds.entities is accessible
                this.get = (target, prop) => target[prop]
                return target[prop]
            }
            // we already know the name so we skip the cds.entities proxy access
            if (prop === 'name') return fq
            // custom properties access on 'target' as well as cached _entity property access goes here
            if (Object.hasOwn(target, prop)) return target[prop]
            // inline enums have to be caught here for first time access, as they do not exist on the entity
            if (customProps.includes(prop)) return target[prop]
            // last but not least we pass the property access to cds.entities
            throw new Error(`Property ${prop} does not exist on entity '${fq}' or cds.entities is not yet defined. Ensure the CDS runtime is fully booted before accessing properties.`)
        }
    })
}.toString()
/* eslint-enable no-undef */

module.exports = { proxyAccessFunction }
