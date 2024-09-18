/**
 * @param {object} options - the options
 * @param {string} options.name - name of the property
 * @param {boolean} [options.declare] - whether the property receives a "declared" modifier
 * @param {boolean} [options.readonly] - whether the property receives a "readonly" modifier
 * @param {boolean} [options.override] - whether the property receives a "readonly" modifier
 * @param {string} [options.type] - the type of the property
 * @param {string} [options.rhs] - the right-hand side of the property (initialiser)
 * @param {string} [options.statementEnd] - the statement end
 */
function staticProperty ({ name, declare = true, readonly = true, override = false, type, rhs, statementEnd = ';' }) {
    if (declare && override) throw new Error('Cannot declare and override a property at the same time')
    let property = name
    if (readonly) property = `readonly ${property}`
    if (override) property = `override ${property}`
    property = `static ${property}`
    if (declare) property = `declare ${property}`
    if (type) property = `${property}: ${type}`
    if (rhs) property = `${property} = ${rhs}`
    if (statementEnd) property += statementEnd
    return property
}

module.exports = {
    empty: 'Record<never, never>',
    staticProperty
}