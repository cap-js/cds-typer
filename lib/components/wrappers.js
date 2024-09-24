'use strict'

// this was derived from baseDefinitions before, but caused a circular dependency
const base = '__'

/**
 * Wraps type into the Key type.
 * @param {string} t - the type name.
 * @returns {string}
 */
const createKey = t => `${base}.Key<${t}>`

/**
 * Wraps type into KeysOf type.
 * @param {string} t - the type name.
 * @returns {string}
 */
const createKeysOf = t => `${base}.KeysOf<${t}>`

/**
 * Wraps type into association to scalar.
 * @param {string} t - the singular type name.
 * @returns {string}
 */
const createToOneAssociation = t => `${base}.Association.to<${t}>`

/**
 * Wraps type into association to vector.
 * @param {string} t - the singular type name.
 * @returns {string}
 */
const createToManyAssociation = t => `${base}.Association.to.many<${t}>`

/**
 * Wraps type into composition of scalar.
 * @param {string} t - the singular type name.
 * @returns {string}
 */
const createCompositionOfOne = t => `${base}.Composition.of<${t}>`

/**
 * Wraps type into composition of vector.
 * @param {string} t - the singular type name.
 * @returns {string}
 */
const createCompositionOfMany = t => `${base}.Composition.of.many<${t}>`

/**
 * Wraps type into an array.
 * @param {string} t - the singular type name.
 * @returns {string}
 */
const createArrayOf = t => `Array<${t}>`

/**
 * Wraps type into object braces
 * @param {string} t - the properties, stringified and comma separated.
 * @returns {string}
 */
const createObjectOf = t => `{${t}}`

/**
 * Wraps types into a union type string
 * @param {string[]} types - an array of types
 * @returns {string}
 */
const createUnionOf = (...types) => types.join(' | ')

/**
 * Wraps type into a promise
 * @param {string} t - the type to wrap.
 * @returns {string}
 * @example
 * ```js
 * createPromiseOf('string') // -> 'Promise<string>'
 * ```
 */
const createPromiseOf = t => `Promise<${t}>`

/**
 * Wraps type into a deep require (removes all posibilities of undefined recursively).
 * @param {string} t - the singular type name.
 * @param {string?} lookup - a property lookup of the required type (`['Foo']`)
 * @returns {string}
 */
const deepRequire = (t, lookup = '') => `${base}.DeepRequired<${t}>${lookup}`

/**
 * Puts a passed string in docstring format.
 * @param {string | undefined} doc - raw string to docify. May contain linebreaks.
 * @returns {string[]} an array of lines wrapped in doc format. The result is not
 *          concatenated to be properly indented by `buffer.add(...)`.
 */
const docify = doc => {
    if (!doc) return []
    const lines = doc.split(/\r?\n/).map(l => l.trim().replaceAll('*/', '*\\/')) // mask any */ with *\/
    if (lines.length === 1) return [`/** ${lines[0]} */`] // one-line doc
    return ['/**'].concat(lines.map(line => `* ${line}`)).concat(['*/'])
}

module.exports = {
    createArrayOf,
    createKey,
    createKeysOf,
    createObjectOf,
    createPromiseOf,
    createUnionOf,
    createToOneAssociation,
    createToManyAssociation,
    createCompositionOfOne,
    createCompositionOfMany,
    deepRequire,
    docify
}