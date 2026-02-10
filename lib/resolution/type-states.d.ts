/**
 * Type state definitions for the Resolver class.
 * These types represent the different states a type can be in during resolution.
 */

import type { EntityCSN } from '../typedefs'
import type { Path } from '../file'
import type { Inflection } from '../typedefs'

/**
 * Base type for all type resolution states.
 * This is the minimal guaranteed state.
 */
export type BaseTypeInfo = {
    isBuiltin: boolean
    isNotNull: boolean
    isInlineDeclaration: boolean
    isForeignKeyReference: boolean
    isArray: boolean
}

/**
 * State after resolveByTypeName for builtin types
 */
export type BuiltinTypeInfo = BaseTypeInfo & {
    isBuiltin: true
    type: string
    plainName?: string  // only set for $self
}

/**
 * State after resolveByTypeName for user-defined types
 */
export type UserDefinedTypeInfo = BaseTypeInfo & {
    isBuiltin: false
    type: string
    plainName: string
    path: Path
    csn: EntityCSN
}

/**
 * Union of possible states after resolveByTypeName
 */
export type NameResolvedTypeInfo = BuiltinTypeInfo | UserDefinedTypeInfo

/**
 * State after resolving an inline declaration
 */
export type InlineDeclarationTypeInfo = BaseTypeInfo & {
    isInlineDeclaration: true
    type: string
    structuredType?: { [key: string]: { typeName: string, typeInfo: TypeResolveInfo } }
    imports?: Path[]
    plainName?: string
}

/**
 * State after resolving a foreign key reference
 */
export type ForeignKeyTypeInfo = NameResolvedTypeInfo & {
    isForeignKeyReference: true
}

/**
 * State after resolving an array type
 */
export type ArrayTypeInfo = BaseTypeInfo & {
    isArray: true
    isBuiltin: true
    inner?: TypeResolveInfo
}

/**
 * State after complete resolution (including inflection)
 */
export type FullyResolvedTypeInfo = (NameResolvedTypeInfo | InlineDeclarationTypeInfo | ForeignKeyTypeInfo) & {
    inflection?: Inflection
    isDeepRequire?: boolean
    typeName?: string
}

/**
 * The general type used throughout resolution.
 * This is intentionally broad as the exact state depends on the resolution path.
 */
export type TypeResolveInfo = Partial<BaseTypeInfo> & {
    type?: string
    path?: Path
    csn?: EntityCSN
    imports?: Path[]
    inner?: TypeResolveInfo
    structuredType?: { [key: string]: { typeName: string, typeInfo: TypeResolveInfo } }
    plainName?: string
    typeName?: string
    inflection?: Inflection
    isDeepRequire?: boolean
}
