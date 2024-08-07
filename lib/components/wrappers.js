'use strict'

// this was derived from baseDefinitions before, but caused a circular dependency
const base = '__'

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
const docify = doc => doc
    ? ['/**'].concat(doc.split('\n').map(line => `* ${line}`)).concat(['*/'])
    : []

module.exports = {
    createArrayOf,
    createObjectOf,
    createToOneAssociation,
    createToManyAssociation,
    createCompositionOfOne,
    createCompositionOfMany,
    deepRequire,
    docify
}