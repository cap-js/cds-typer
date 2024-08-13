/**
 * Determines the proper modifiers for a property.
 * For most properties, this will be "declare". But for some properties,
 * like fields of a type, we don't want any modifiers.
 * @param {import('../typedefs').resolver.EntityCSN} element - The element to determine the modifiers for.
 * @returns {import('../typedefs').resolver.PropertyModifier[]} The modifiers for the property.
 */
const getPropertyModifiers = element => element?.parent?.kind !== 'type' ? ['declare'] : []

module.exports = {
    getPropertyModifiers
}