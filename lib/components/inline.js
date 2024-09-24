const { configuration } = require('../config')
const { SourceFile, Buffer } = require('../file')
const { normalise } = require('./identifier')
const { docify } = require('./wrappers')

/** @typedef {import('../resolution/resolver').TypeResolveInfo} TypeResolveInfo */
/** @typedef {import('../typedefs').visitor.Inflection} Inflection */
/** @typedef {import('../typedefs').resolver.PropertyModifier} PropertyModifier */
/** @typedef {import('../visitor').Visitor} Visitor */
/** @typedef {{typeName: string, typeInfo: TypeResolveInfo}} TypeResolveInfo_ */

/**
 * Inline declarations of types can come in different flavours.
 * The compiler can therefore be adjusted to print out one or the other
 * by plugging different implementations of this abstract class into
 * their resolution mechanism.
 */
class InlineDeclarationResolver {
    /**
     * @param {object} options - options to be passed to the resolver
     * @param {string} options.fq - full qualifier of the type
     * @param {TypeResolveInfo_} options.type - type info so far
     * @param {import('../file').Buffer} options.buffer - the buffer to write into
     * @param {PropertyModifier[]} options.modifiers - modifiers to add to each generated property
     * @param {string} [options.statementEnd] - statement ending character
     * @protected
     * @abstract
     */
    // eslint-disable-next-line no-unused-vars
    printInlineType({fq, type, buffer, modifiers, statementEnd}) { /* abstract */ }

    /**
     * Attempts to resolve a type that could reference another type.
     * @param {any} items - properties of the declaration we are resolving
     * @param {TypeResolveInfo} into - @see Visitor.resolveType
     * @param {SourceFile} relativeTo - file to which the resolved type should be relative to
     * @public
     */
    resolveInlineDeclaration(items, into, relativeTo) {
        const dummy = new SourceFile(relativeTo.path.asDirectory())
        dummy.classes.currentIndent = relativeTo.classes.currentIndent
        dummy.classes.add('{')
        dummy.classes.indent()

        into.structuredType = {}
        for (const [subname, subelement] of Object.entries(items ?? {})) {
            // in inline definitions, we sometimes have to resolve first
            // FIXME: does this tie in with how we sometimes end up with resolved typed in resolveType()?
            // FIXME2: I don't think the if branch is actually called in real world situations.
            // so we can probably get rid of this distinction and make #resolveTypeName private again
            const se = (typeof subelement === 'string')
                ? this.visitor.resolver.resolveTypeName(subelement)
                : subelement
            into.structuredType[subname] = this.visitor.visitElement(subname, se, dummy)
        }
        dummy.classes.outdent()
        dummy.classes.add('}')
        // FIXME: pass as param
        //dummy.classes.add(element.constructor.name === 'array' ? '}[]' : '}')
        into.imports = (into.imports ?? []).concat(...Object.values(dummy.imports))
        into.isInlineDeclaration = true
        //into.structuredType = dummy
        Object.defineProperty(into, 'type', {
            get: () => dummy.classes.join('\n')
        })
    }

    /**
     * Visits a single element in an entity.
     * @param {object} options - options
     * @param {string} options.name - name of the element
     * @param {import('../typedefs').resolver.EntityCSN} options.element - CSN data belonging to the the element.
     * @param {SourceFile} options.file - the namespace file the surrounding entity is being printed into.
     * @param {Buffer} options.buffer - buffer to add the definition to. If no buffer is passed, the passed file's class buffer is used instead.
     * @param {PropertyModifier[]} options.modifiers - modifiers to add to each generated property
     * @public
     */
    visitElement({name, element, file, buffer = file.classes, modifiers = []}) {
        this.depth++
        for (const d of docify(element.doc)) {
            buffer.add(d)
        }
        const type = this.visitor.resolver.resolveAndRequire(element, file)
        this.depth--
        if (this.depth === 0) {
            this.printInlineType({fq: name, type, buffer, modifiers})
        }
        return type
    }

    /**
     * Separator between value V and type T: `v : T`.
     * Depending on the visitor's setting, this is may be `?:` for optional
     * properties or `:` for required properties.
     * @returns {'?:'|':'}
     */
    getPropertyTypeSeparator() {
        return configuration.propertiesOptional ? '?:' : ':'
    }

    /**
     * It returns TypeScript datatype for provided TS property
     * @param {TypeResolveInfo_} type - type of the property
     * @param {string} typeName - name of the TypeScript property
     * @returns {string} the datatype to be presented on TypeScript layer
     * @public
     */
    getPropertyDatatype(type, typeName = type.typeName) {
        return type.typeInfo.isNotNull ? typeName : `${typeName} | null`
    }

    /**
     * Stringifies additional modifiers for a property
     * @param {(PropertyModifier)[]} modifiers - modifiers to stringify
     * @returns {string} the modifiers as a string
     */
    stringifyModifiers (modifiers) {
        return modifiers?.length > 0 ? modifiers.join(' ') + ' ' : ''
    }

    /** @param {Visitor} visitor - the visitor */
    constructor(visitor) {
        this.visitor = visitor
        // type resolution might recurse. This indicator is used to determine
        // when the type has been fully resolve (depth === 0) and should be printed
        this.depth = 0
    }

    /**
     * Produces a string representation of how to produce a [Typescript type lookup](https://www.typescriptlang.org/docs/handbook/2/indexed-access-types.html#handbook-content)
     * under the current configuration.
     * @example
     * ```ts
     * type T = {
     *   a: {
     *     b: number
     *   }
     * }
     *
     * T['a']['b']  // number
     * ```
     * but especially with inline declarations, the access will differ between flattened and nested representations.
     * @param {string[]} members - a list of members, in the above example it would be `['a', 'b']`
     * @returns {string} type access string snippet. In the above sample, we would return `"['a']['b']"`
     * @public
     * @abstract
     */
    // eslint-disable-next-line no-unused-vars
    getTypeLookup(members) { /* abstract */ return '' }
}

/**
 * Resolves inline declarations in a flat fashion.
 * @example
 * ```cds
 * // cds
 * entity E {
 *   x: { a: Integer; b: String; }
 * }
 * ```
 * ↓
 * ```ts
 * // ts
 * class E {
 *   x_a: number;
 *   x_b: string;
 * }
 * ```
 */
class FlatInlineDeclarationResolver extends InlineDeclarationResolver {
    /**
     * @param {string} p - prefix to use
     */
    prefix(p) {
        return p ? `${p}_` : ''
    }

    /**
     * @param {object} options - options
     * @param {string} options.prefix - prefix to use
     * @param {TypeResolveInfo_} options.type - type to flatten
     * @param {PropertyModifier[]} options.modifiers - modifiers to add to each generated property
     * @returns {string[]} the flattened properties
     */
    flatten({prefix, type, modifiers}) {
        return type.typeInfo.structuredType
            ? Object.entries(type.typeInfo.structuredType).map(
                ([k,v]) => this.flatten({prefix: `${this.prefix(prefix)}${k}`, type: v, modifiers})  // for flat we pass the modifiers!
            ).flat()
            : [`${this.stringifyModifiers(modifiers)}${normalise(prefix)}${this.getPropertyTypeSeparator()} ${this.getPropertyDatatype(type)}`]
    }

    /**
     * @override
     * @type {InlineDeclarationResolver['printInlineType']}
     */
    printInlineType({fq, type, buffer, modifiers}) {
        for(const prop of this.flatten({prefix: fq, type, modifiers}).flat()) {
            buffer.add(prop)
        }
    }

    /**
     * @override
     * @type {InlineDeclarationResolver['getTypeLookup']}
     */
    getTypeLookup(members)  {
        return `['${members.join('_')}']`
    }
}

/**
 * Resolves inline declarations to a structured type.
 * @example
 * ```cds
 * // cds
 * entity E {
 *   x: { a: Integer; b: String; }
 * }
 * ```
 * ↓
 * ```ts
 * // ts
 * class E {
 *   x: { a: number; b: string; }
 * }
 * ```
 */
class StructuredInlineDeclarationResolver extends InlineDeclarationResolver {
    /** @param {Visitor} visitor - the visitor */
    constructor(visitor) {
        super(visitor)
        this.printDepth = 0
    }

    /**
     * @param {object} options - options
     * @param {string} options.fq - full qualifier of the type
     * @param {TypeResolveInfo_} options.type - type info so far
     * @param {Buffer} options.buffer - the buffer to write into
     * @param {PropertyModifier[]} [options.modifiers] - modifiers to add to each generated property
     * @param {string} [options.statementEnd] - statement ending character
     * FIXME: reuse type
     */
    flatten({fq, type, buffer, modifiers = [], statementEnd = ';'}) {
        // in addition to the regular depth during resolution, we may have another depth while printing
        // nested types on which the line ending depends
        this.printDepth++
        const lineEnding = this.printDepth > 1 ? ',' : statementEnd
        if (type.typeInfo.structuredType) {
            const prefix = fq ? `${this.stringifyModifiers(modifiers)}${normalise(fq)}${this.getPropertyTypeSeparator()}`: ''
            buffer.add(`${prefix} {`)
            buffer.indent()
            for (const [n, t] of Object.entries(type.typeInfo.structuredType)) {
                this.flatten({fq: n, type: t, buffer})
            }
            buffer.outdent()
            buffer.add(`}${this.getPropertyDatatype(type, '')}${lineEnding}`)
        } else {
            buffer.add(`${this.stringifyModifiers(modifiers)}${normalise(fq)}${this.getPropertyTypeSeparator()} ${this.getPropertyDatatype(type)}${lineEnding}`)
        }
        this.printDepth--
        return buffer
    }

    /**
     * @override
     * @type {InlineDeclarationResolver['printInlineType']}
     */
    printInlineType({fq, type, buffer, modifiers, statementEnd}) {
        // FIXME: indent not quite right
        const sub = new Buffer()
        sub.currentIndent = buffer.currentIndent
        buffer.add(this.flatten({fq, type, buffer: sub, modifiers, statementEnd}).join())
    }

    /**
     * @override
     * @type {InlineDeclarationResolver['getTypeLookup']}
     */
    getTypeLookup(members)  {
        return members.map(m => `['${m}']`).join('')
    }
}

module.exports = {
    FlatInlineDeclarationResolver,
    StructuredInlineDeclarationResolver
}