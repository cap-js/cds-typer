const { SourceFile, Buffer } = require('../file')
const { normalise } = require('./identifier')
const { docify } = require('./wrappers')

/** @typedef {import('../resolution/resolver').TypeResolveInfo} TypeResolveInfo */

/**
 * Inline declarations of types can come in different flavours.
 * The compiler can therefore be adjusted to print out one or the other
 * by plugging different implementations of this abstract class into
 * their resolution mechanism.
 */
class InlineDeclarationResolver {
    /**
     * @param {string} fq - full qualifier of the type
     * @param {TypeResolveInfo} type - type info so far
     * @param {import('../file').Buffer} buffer - the buffer to write into
     * @param {string} statementEnd - statement ending character
     * @protected
     * @abstract
     */
    // eslint-disable-next-line no-unused-vars
    printInlineType(fq, type, buffer, statementEnd) { /* abstract */ }

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
     * @param {string} name - name of the element
     * @param {import('../resolution/resolver').CSN} element - CSN data belonging to the the element.
     * @param {SourceFile} file - the namespace file the surrounding entity is being printed into.
     * @param {Buffer} [buffer] - buffer to add the definition to. If no buffer is passed, the passed file's class buffer is used instead.
     * @public
     */
    visitElement(name, element, file, buffer = file.classes) {
        this.depth++
        for (const d of docify(element.doc)) {
            buffer.add(d)
        }
        const type = this.visitor.resolver.resolveAndRequire(element, file)
        this.depth--
        if (this.depth === 0) {
            this.printInlineType(name, type, buffer)
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
        return this.visitor.options.propertiesOptional ? '?:' : ':'
    }

    /**
     * It returns TypeScript datatype for provided TS property
     * @param {{typeName: string, typeInfo: TypeResolveInfo & { inflection: Inflection } }} type - type of the property
     * @param {string} typeName - name of the TypeScript property
     * @returns {string} the datatype to be presented on TypeScript layer
     * @public
     */
    getPropertyDatatype(type, typeName = type.typeName) {
        return type.typeInfo.isNotNull ? typeName : `${typeName} | null`
    }

    /** @param {import('../visitor').Visitor} visitor - the visitor */
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
    constructor(visitor) { super(visitor) }

    prefix(p) {
        return p ? `${p}_` : ''
    }

    flatten(prefix, type) {
        return type.typeInfo.structuredType
            ? Object.entries(type.typeInfo.structuredType).map(([k,v]) => this.flatten(`${this.prefix(prefix)}${k}`, v))
            : [`${normalise(prefix)}${this.getPropertyTypeSeparator()} ${this.getPropertyDatatype(type)}`]
    }

    printInlineType(name, type, buffer) {
        for(const prop of this.flatten(name, type).flat()) {
            buffer.add(prop)
        }
    }

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
    constructor(visitor) {
        super(visitor)
        this.printDepth = 0
    }

    flatten(name, type, buffer, statementEnd = ';') {
        // in addition to the regular depth during resolution, we may have another depth while printing
        // nested types on which the line ending depends
        this.printDepth++
        const lineEnding = this.printDepth > 1 ? ',' : statementEnd
        if (type.typeInfo.structuredType) {
            const prefix = name ? `${normalise(name)}${this.getPropertyTypeSeparator()}`: ''
            buffer.add(`${prefix} {`)
            buffer.indent()
            for (const [n, t] of Object.entries(type.typeInfo.structuredType)) {
                this.flatten(n, t, buffer)
            }
            buffer.outdent()
            buffer.add(`}${this.getPropertyDatatype(type, '')}${lineEnding}`)
        } else {
            buffer.add(`${normalise(name)}${this.getPropertyTypeSeparator()} ${this.getPropertyDatatype(type)}${lineEnding}`)
        }
        this.printDepth--
        return buffer
    }

    printInlineType(name, type, buffer, statementEnd) {
        // FIXME: indent not quite right
        const sub = new Buffer()
        sub.currentIndent = buffer.currentIndent
        buffer.add(this.flatten(name, type, sub, statementEnd).join())
    }

    getTypeLookup(members)  {
        return members.map(m => `['${m}']`).join('')
    }
}

module.exports = {
    FlatInlineDeclarationResolver,
    StructuredInlineDeclarationResolver
}