const isValidIdent = /^[_$a-zA-Z][$\w]*$/

/**
 * Normalises an identifier to a valid JavaScript identifier.
 * I.e. either the identifier itself or a quoted string.
 * @param {string} ident the identifier to normalise
 * @returns {string} the normalised identifier
 */
const normalise = ident => ident && !isValidIdent.test(ident)
    ? `"${ident}"`
    : ident

module.exports = {
    normalise
}