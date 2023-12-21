/**
 * Normalises an identifier to a valid JavaScript identifier.
 * I.e. either the identifier itself or a quoted string.
 * @param {string} ident the identifier to normalise
 * @returns {string} the normalised identifier
 */
const normalise = ident => ident?.match(/^[_$a-zA-Z][$\w]*/)
    ? `"${ident}"`
    : ident

module.exports = {
    normalise
}