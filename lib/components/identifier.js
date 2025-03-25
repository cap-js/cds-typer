require('@sap/cds')
const { createHash } = require('node:crypto')
const isValidIdent = /^[_$a-zA-Z][$\w]*$/
const nameHash = createHash('md5')
// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Lexical_grammar
const javaScriptReserved = new Set([
    'abstract',
    'arguments',
    'await',
    'boolean',
    'break',
    'byte',
    'case',
    'catch',
    'char',
    'class',
    'const',
    'continue',
    'debugger',
    'default',
    'delete',
    'do',
    'double',
    'else',
    'enum',
    'eval',
    'export',
    'extends',
    'false',
    'final',
    'finally',
    'float',
    'for',
    'function',
    'goto',
    'if',
    'implements',
    'import',
    'in',
    'instanceof',
    'int',
    'interface',
    'let',
    'long',
    'native',
    'new',
    'null',
    'object',
    'package',
    'private',
    'protected',
    'public',
    'return',
    'short',
    'static',
    'super',
    'switch',
    'synchronized',
    'this',
    'throw',
    'throws',
    'transient',
    'true',
    'try',
    'typeof',
    'var',
    'void',
    'volatile',
    'while',
    'with',
    'yield',
])

/**
 * Enquotes an identifier to a valid JavaScript identifier.
 * I.e. either the identifier itself or a quoted string.
 * This function is suited to escape properties with exotic characters.
 * To handle class names, see {@link normalise}.
 * @param {string} ident - the identifier to normalise
 * @returns {string} the normalised identifier
 */
const enquote = ident => ident && !isValidIdent.test(ident)
    ? `"${ident}"`
    : ident

/**
 * Returns the last part of a dot-separated identifier.
 * @param {string} ident - the identifier to extract the last part from
 * @returns {string} the last part of the identifier
 */
const last = ident => ident.split('.').at(-1) ?? ident


/**
 * Normalises the name of a service or entity.
 * This function is suited to normalise class names.
 * To handle properties with exotic characters, see {@link enquote}.
 * @param {string} name - name of the entity or fq thereof.
 */
const normalise = name => {
    const simple = /** @type {string} */ (name.split('.').at(-1))
    let normalised = simple.match(/^[a-zA-Z]+\w*$/)
        ? simple
        : `__${simple.replaceAll(/[^a-zA-Z0-9]/g, '_')}`
    if (/^_+$/.test(normalised)) {
        // very rare case when the entire name consists of non-alphanumeric characters (Kanji, etc)
        // That would leave us with just underscores,
        // which is has high potential of colliding with other such names
        // -> fall back to hash
        normalised = nameHash.update(name).digest('hex')
    }
    if (javaScriptReserved.has(normalised)) {
        normalised = `__${name}`
    }
    return {
        original: name,
        simple,
        normalised,
        wasNormalised: simple !== normalised
    }
}

module.exports = {
    enquote,
    last,
    normalise
}