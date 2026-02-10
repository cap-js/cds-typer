'use strict'

/**
 * Type guards for TypeResolveInfo states.
 * These help narrow the type to specific resolution states.
 * @module type-guards
 */

/**
 * Type guard to check if a TypeResolveInfo is a user-defined type.
 * @param {import('../typedefs').resolver.TypeResolveInfo} info - info
 * @returns {info is import('../typedefs').resolver.UserDefinedTypeInfo}
 * @example
 * ```js
 * if (isUserDefined(typeInfo)) {
 *   // typeInfo.path, typeInfo.csn, typeInfo.plainName are guaranteed to exist
 *   file.addImport(typeInfo.path)
 * }
 * ```
 */
function isUserDefined(info) {
    return info.isBuiltin === false &&
           info.plainName !== undefined &&
           info.path !== undefined &&
           info.csn !== undefined
}

/**
 * Type guard to check if a TypeResolveInfo is a builtin type.
 * @param {import('../typedefs').resolver.TypeResolveInfo} info - info
 * @returns {info is import('../typedefs').resolver.BuiltinTypeInfo}
 */
function isBuiltinType(info) {
    return info.isBuiltin === true
}

/**
 * Type guard to check if a TypeResolveInfo is an inline declaration.
 * @param {import('../typedefs').resolver.TypeResolveInfo} info - info
 * @returns {info is import('../typedefs').resolver.InlineDeclarationTypeInfo}
 */
function isInlineDeclaration(info) {
    return info.isInlineDeclaration === true
}

/**
 * Type guard to check if a TypeResolveInfo is a foreign key reference.
 * @param {import('../typedefs').resolver.TypeResolveInfo} info - info
 * @returns {info is import('../typedefs').resolver.ForeignKeyTypeInfo}
 */
function isForeignKeyReference(info) {
    return info.isForeignKeyReference === true
}

/**
 * Type guard to check if a TypeResolveInfo is an array type.
 * @param {import('../typedefs').resolver.TypeResolveInfo} info - info
 * @returns {info is import('../typedefs').resolver.ArrayTypeInfo}
 */
function isArrayType(info) {
    return info.isArray === true
}

/**
 * Type guard to check if a TypeResolveInfo has been fully resolved with inflection.
 * @param {import('../typedefs').resolver.TypeResolveInfo} info - info
 * @returns {info is import('../typedefs').resolver.FullyResolvedTypeInfo}
 */
function isFullyResolved(info) {
    return info.inflection !== undefined
}

/**
 * Type guard to check if a TypeResolveInfo has been name-resolved (builtin or user-defined).
 * @param {import('../typedefs').resolver.TypeResolveInfo} info - info
 * @returns {info is import('../typedefs').resolver.NameResolvedTypeInfo}
 */
function isNameResolved(info) {
    return info.type !== undefined && info.isBuiltin !== undefined
}

module.exports = {
    isUserDefined,
    isBuiltinType,
    isInlineDeclaration,
    isForeignKeyReference,
    isArrayType,
    isFullyResolved,
    isNameResolved
}
