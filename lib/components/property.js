/**
 * Determines the proper modifiers for a property.
 * 
 * All properties must be modified by `declare`.
 * The only exception to this is in case of an action return type being defined
 * as an object. Here `declare` would cause an error.
 * This case can be identified by checking the parent of the property:
 * If the parent is a type and has no name, then it is an action return type.
 * 
 * @param {import('../typedefs').resolver.EntityCSN} element - The element to determine the modifiers for.
 * @returns {import('../typedefs').resolver.PropertyModifier[]} The modifiers for the property.
 */
const getPropertyModifiers = element => element?.parent?.kind === 'type' && element?.parent?.name === undefined ? [] : ['declare']

module.exports = {
    getPropertyModifiers
}