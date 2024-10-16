/**
 * Create a class member with given modifiers in the right order.
 * @param {object} options - options
 * @param {string} options.name - the name of the member
 * @param {string} [options.type] - the type of the member
 * @param {string} [options.initialiser] - the initialiser for the member
 * @param {string} [options.statementEnd] - the closing character for the member
 * @param {boolean} [options.isDeclare] - whether the member is declared
 * @param {boolean} [options.isStatic] - whether the member is static
 * @param {boolean} [options.isReadonly] - whether the member is readonly
 * @param {boolean} [options.isOverride] - whether the member is an override
 */
function createMember ({name, type = undefined, initialiser = undefined, statementEnd = ';', isDeclare = false,  isStatic = false, isReadonly = false, isOverride = false}) {
    if (isDeclare && isOverride) {
        throw new Error(`cannot have a member '${name}' with both declare and override modifiers`)
    }
    const parts = []

    if (isDeclare) parts.push('declare')
    if (isStatic) parts.push('static')
    if (isOverride) parts.push('override')
    if (isReadonly) parts.push('readonly')

    parts.push(name)
    if (type) parts.push(`: ${type}`)
    if (initialiser) parts.push(` = ${initialiser}`)

    const member = parts.join(' ')
    return statementEnd
        ? `${member}${statementEnd}`
        : member
}

module.exports = {
    createMember
}