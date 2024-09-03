/* eslint-disable no-undef */
// this function will be stringified as part of the generated types and is not supposed to be used internally
const proxyAccessFunction = function (namespace, name, opts = {}) {
    const { target, customProps } = { target: {}, customProps: [], ...opts }
    const fq = namespace !== '' ? `${namespace}.${name}` : name
    let entity
    return new Proxy(target, {
        get: function (target, prop) {
            // we already know the name so we skip the cds.entities proxy access
            if (prop === 'name') return fq
            // custom properties access on 'target' as well as cached _entity property access goes here
            if (Object.hasOwn(target, prop)) return target[prop]
            // inline enums have to be caught here for first time access, as they do not exist on the entity
            if (customProps.includes(prop)) return target[prop]
            // last but not least we pass the property access to cds.entities
            if (cds.entities) {
                entity ??= cds.entities[fq]
                if (!entity) throw new Error(`'${fq}' could not be found in cds.entities('${namespace}')`)
                if (entity[prop]) target[prop] = entity[prop]
                return target[prop]
            }
            throw new Error(`Property ${prop} does not exist on entity '${fq}' or cds.entities is not yet defined`)
        }
    })
}.toString()
/* eslint-enable no-undef */

module.exports = { proxyAccessFunction }
