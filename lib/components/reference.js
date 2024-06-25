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
 * @param {{type: any}} element - the element
 * @returns boolean
 */
const isReferenceType = element => element.type && Object.hasOwn(element.type, 'ref')

module.exports = {
    isReferenceType
}