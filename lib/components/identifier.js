const isValidIdent = /^[_$a-zA-Z][$\w]*$/

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
    const normalised = simple.match(/^[a-zA-Z]+\w*$/)
        ? simple
        : `__${simple.replaceAll(/[^a-zA-Z0-9]/g, '_')}`
    return {
        simple,
        normalised,
        isNormalised: simple !== normalised
    }
}

module.exports = {
    enquote,
    last,
    normalise
}