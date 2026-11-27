/**
 * Check if an element references another type.
 * This happens for foreign key relationships
 * and for the typeof syntax.
 *
 * ```cds
 * entity E {
 * x: Integer
 * }
 *
 * entity F {
 * y: E.x  // <- ref
 * }
 * ```
 * @param {import('../typedefs').resolver.EntityCSN} element - the element
 * @returns {boolean} whether the element type is a reference
 */
const isReferenceType = element => Boolean(element.type && typeof element.type === 'object' && Object.hasOwn(element.type, 'ref'))

module.exports = {
    isReferenceType
}
