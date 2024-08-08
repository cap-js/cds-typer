const isValidIdent = /^[_$a-zA-Z][$\w]*$/

/**
 * Normalises an identifier to a valid JavaScript identifier.
 * I.e. either the identifier itself or a quoted string.
 * @param {string} ident - the identifier to normalise
 * @returns {string} the normalised identifier
 */
const normalise = ident => ident && !isValidIdent.test(ident)
    ? `"${ident}"`
    : ident

/**
 * Returns the last part of a dot-separated identifier.
 * @param {string} ident - the identifier to extract the last part from
 * @returns {string} the last part of the identifier
 */
const last = ident => ident.split('.').at(-1) ?? ident

module.exports = {
    normalise,
    last
}