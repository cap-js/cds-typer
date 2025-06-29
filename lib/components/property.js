/**
 * Determines the proper modifiers for a property.
 * For most properties, this will be "declare". But for some properties,
 * like fields of a type, we don't want any modifiers.
 * A check for the parents name is necessary to avoid adding declare to
 * properties of a object type reference. These will have the object type as
 * their parent's name.
 * @param {import('../typedefs').resolver.EntityCSN} element - The element to determine the modifiers for.
 * @returns {import('../typedefs').resolver.PropertyModifier[]} The modifiers for the property.
 */
const getPropertyModifiers = element => element?.parent?.kind === 'type' && element?.parent?.name === undefined ? [] : ['declare']

module.exports = {
    getPropertyModifiers
}