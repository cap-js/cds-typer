const { createMember } = require('../components/class')
const { isType, isEnum, isDraftEnabled } = require('../csn')
const { stringIdent, unionOf, intersectionOf, docify, keysOf, elementsOf, draftsOf, draftOf } = require('./wrappers')
const { SourceFile } = require('../file')
const { asClassIdentifier } = require('../resolution/entity')
const { empty } = require('../components/typescript')
const { configuration } = require('../config')
const { stringifyEnumType, csnToEnumPairs } = require('../components/enum')

/** @typedef {import('../typedefs').printer.PrintContext} PrintContext */
/** @typedef {import('../csn').EntityCSN} EntityCSN */
/** @typedef {import('../typedefs').resolver.EnumCSN} EnumCSN */
/** @typedef {import('../typedefs').resolver.EntityInfo} EntityInfo */
/** @typedef {import('../file').Buffer} Buffer */
/** @typedef {import('../components/identifier')} Identifier */

/**
 * Indent each line of a string by a specified number of spaces
 * @param {string | string[]} [str] - the string to indent
 * @param {number} spaces - number of spaces to indent
 * @returns {string} indented string
 */
function indent(str, spaces = 2) {
    if (!str) return ''
    const indentation = ' '.repeat(spaces)
    return (Array.isArray(str) ? str : str.split('\n'))
        .map(line => line ? indentation + line : line)
        .join('\n')
}

class TypeScriptPrinter {
    /**
     * Resolver instance, set temporarily when needed by helper methods
     * @type {import('../resolution/resolver').Resolver | undefined}
     */
    resolver

    /**
     * @type {import('../visitor').Visitor}
     */
    #visitor

    /**
     * @param {import('../visitor').Visitor} visitor - the visitor instance to use for printing
     */
    constructor (visitor) {
        this.#visitor = visitor
    }

    /**
     * @abstract
     * @param {PrintContext} ctx - context containing all data needed for printing
     * @returns {string} the aspect function declaration
     */
    // eslint-disable-next-line no-unused-vars
    printAspectFunction (ctx) {
        throw Error('not implemented')
    }

    /**
     * @abstract
     * @param {PrintContext} ctx - context containing all data needed for printing
     * @returns {string}
     */
    // eslint-disable-next-line no-unused-vars
    printAspect(ctx) {
        throw Error('not implemented')
    }


    /**
     * @abstract
     * @param {PrintContext} ctx - context containing all data needed for printing
     * @returns {string}
     */
    // eslint-disable-next-line no-unused-vars
    printKindProperty(ctx) {
        throw Error('not implemented')
    }

    /**
     * Prints the const declaration part of an enum
     * @abstract
     * @param {import('../typedefs').printer.EnumPrintContext} ctx - context containing enum data
     * @returns {string} the const declaration
     */
    // eslint-disable-next-line no-unused-vars
    printEnumConst(ctx) {
        throw Error('not implemented')
    }

    /**
     * @param {string} fq - fully qualified name of the entity
     * @param {string} clean - the clean name of the entity
     * @param {boolean} [isPlural] - `true` if passed entity is plural
     */
    #staticClassContents(fq, clean, isPlural = false) {
        if (!isDraftEnabled(fq)) return []
        return [`static drafts: ${isPlural ? draftsOf(clean) : draftOf(clean)}`]
    }

    /**
     * Prints the singular class extending its own aspect.
     * @param {object} ctx - context
     * @param {string} ctx.clean - the clean name of the entity
     * @param {string} ctx.aspectFunctionName - the name of the aspect function to apply to the base class
     * @param {SourceFile} ctx.baseDefinitions - the base definitions to extend, used for determining the file to import from
     * @param {string} ctx.fq - fully qualified name of the entity
     * @returns {string} the class declaration
     */
    printSingularClass({clean, aspectFunctionName, baseDefinitions, fq}) {
        // plural can not be a type alias to $singular[] but needs to be a proper class instead,
        // so it can get passed as value to CQL functions.
        return [
            `export class ${clean} extends ${aspectFunctionName}(${baseDefinitions.path.asIdentifier()}.Entity) {`,
            indent(this.#staticClassContents(fq, clean).join('\n'), 2),
            '}'
        ].join('\n')
    }

    /**
     * @param {object} ctx - context
     * @param {string} ctx.fq - full qualifier
     * @param {import('../resolution/resolver').Inflection} ctx.inflection - entity inflection
     */
    printPluralClass({fq, inflection: { singular, plural }}) {
        const additionalProperties = this.#staticClassContents(fq, singular.plain, true)
        additionalProperties.push('$count?: number')
        return [
            `export class ${plural.normalised.plain} extends Array<${singular.normalised.plain}> {`,
            indent(additionalProperties.join('\n'), 2),
            '}'
        ].join('\n')
    }

    /**
     * Stringifies function parameters in preparation of passing them to {@link SourceFile.stringifyLambda}.
     * Resolves all parameters to a pair of parameter name and name of the resolved type.
     * Also filters out parameters that indicate a binding parameter ({@link https://cap.cloud.sap/docs/releases/jan23#simplified-syntax-for-binding-parameters}).
     * @param {{[key:string]: EntityCSN}} params - parameter list as found in CSN.
     * @param {SourceFile} file - source file relative to which the parameter types should be resolved.
     * @returns {import('../typedefs').visitor.ParamInfo[]} tuple of name, modifier, type and doc.
     */
    #stringifyFunctionParams(params, file) {
        return Object.entries(params ?? {})
            // filter params of type '[many] $self', as they are not to be part of the implementation
            .filter(([, type]) => type?.type !== '$self' && type.items?.type !== '$self')
            .map(([name, type]) => ({
                name,
                modifier: this.#visitor.resolver.isOptional(type) && !this.#visitor.resolver.isMandatory(type)
                    ? '?'
                    : '',
                type: this.#stringifyFunctionParamType(type, file),
                doc: docify(type.doc).join('\n'),
            }))
    }

    /**
     * @param {EntityCSN | EnumCSN} type - type
     * @param {SourceFile} file - the file to resolve types into
     */
    #stringifyFunctionParamType(type, file) {
        // if type.type is not 'cds.String', 'cds.Integer', ..., then we are actually looking
        //  at a named enum type. In that case also resolve that type name
        const isNamedEnumType = isEnum(type) && this.#visitor.resolver.builtinResolver.resolveBuiltin(type.type)
        if (isNamedEnumType) return stringifyEnumType(csnToEnumPairs(type))
        const paramType = this.#visitor.resolver.resolveAndRequire(type, file)
        return this.#visitor.inlineDeclarationResolver.getPropertyDatatype(
            paramType,
            paramType.typeName  // Use typeName which includes namespace prefix
        )
    }

    /**
     * Public method to stringify function parameters. Can be called from visitor.
     * @param {object} params - parameters object
     * @param {{[key:string]: EntityCSN}} params.params - parameter list as found in CSN
     * @param {SourceFile} params.file - source file relative to which the parameter types should be resolved
     * @param {import('../resolution/resolver').Resolver} params.resolver - the resolver to use for type resolution
     * @param {import('../components/inline').FlatInlineDeclarationResolver | import('../components/inline').StructuredInlineDeclarationResolver} params.inlineDeclarationResolver - the inline declaration resolver
     * @returns {import('../typedefs').visitor.ParamInfo[]} tuple of name, modifier, type and doc
     */
    stringifyFunctionParams({params, file, resolver, inlineDeclarationResolver}) {
        // Temporarily set resolver and inlineDeclarationResolver
        this.resolver = resolver
        this.inlineDeclarationResolver = inlineDeclarationResolver
        const result = this.#stringifyFunctionParams(params, file)
        return result
    }

    /**
     * @param {object} params - parameters object
     * @param {import('../csn').EntityCSN} params.entity - the entity to print the actions for
     * @param {string} params.clean - the clean entity name
     * @param {import('../typedefs').resolver.EntityInfo[]} params.ancestors - the fully qualified names of the ancestors of the entity
     * @param {import('../file').SourceFile} params.file - the file the entity is being printed into
     * @param {import('../resolution/resolver').Resolver} params.resolver - the resolver to use for type resolution
     * @param {import('../components/inline').FlatInlineDeclarationResolver | import('../components/inline').StructuredInlineDeclarationResolver} params.inlineDeclarationResolver - the inline declaration resolver
     * @returns {string} the static actions member declaration
     */
    printStaticActions({entity, clean, ancestors, file, resolver, inlineDeclarationResolver}) {
        // TODO: refactor away All these printing functionalities need to go
        const actions = Object.entries(entity.actions ?? {})
        const inherited = ancestors
            // Filter out ancestors whose class name matches the current class to avoid circular references
            .filter(a => {
                const ancestorClassName = isType(a.csn) ? a.entityName : a.inflection.singular?.plain
                return ancestorClassName !== clean
            })
            .map(a => `typeof ${asClassIdentifier({info: a, relative: file.path})}.actions`)

        // Temporarily use the resolver and inlineDeclarationResolver for this method
        this.resolver = resolver
        this.inlineDeclarationResolver = inlineDeclarationResolver

        const { Buffer } = require('../file')
        const typeBuffer = new Buffer()
        if (actions.length) {
            typeBuffer.addIndentedBlock(intersectionOf(...inherited, '{'),
                () => {
                    for (const [aname, action] of actions) {
                        const [opener, content, closer] = SourceFile.stringifyLambda({
                            self: clean,
                            name: aname,
                            parameters: this.#stringifyFunctionParams(action.params, file),
                            returns: action.returns
                                ? this.#visitor.resolver.resolveAndRequire(action.returns, file).typeName
                                : 'any',
                            kind: action.kind,
                            doc: docify(action.doc)})
                        typeBuffer.addIndentedBlock(opener, content, closer)
                    }
                }, '}')
        } else {
            typeBuffer.add(intersectionOf(...inherited, empty))
        }

        return createMember({
            name: 'actions',
            type: typeBuffer.join().trimStart(),  // remove leading whitespace from indentation, as type is printed in line
            isStatic: !configuration.outputDTsFiles,
            isReadonly: true,
            isDeclare: !configuration.outputDTsFiles,
        })
    }

    /**
     * @param {object} params - parameters object
     * @param {string} params.clean - the clean name of the entity
     * @param {import('../typedefs').resolver.EntityInfo[]} params.ancestors - ancestors infos to include in they type
     * @param {SourceFile} params.file - the file the entity is being printed into
     * @returns {string} the static keys member declaration
     */
    printStaticKeys({clean, ancestors, file}) {
        const ancestorKeys = ancestors
            .filter(a => Object.entries(a.csn.keys ?? {}).length)
            // Filter out ancestors whose class name matches the current class to avoid circular references
            // This happens when a nested entity has the same @singular as its ancestor
            .filter(a => {
                const ancestorClassName = isType(a.csn) ? a.entityName : a.inflection.singular?.plain
                return ancestorClassName !== clean
            })
            .map(a => `typeof ${asClassIdentifier({info: a, relative: file.path})}.keys`)
        return createMember({
            name: 'keys',
            type: intersectionOf(keysOf(clean), ...ancestorKeys),
            isDeclare: !configuration.outputDTsFiles,
            isStatic: !configuration.outputDTsFiles,
            isReadonly: true,
        })
    }

    /**
     * @param {object} params - parameters object
     * @param {string} params.clean - the clean name of the entity
     * @returns {string} the static elements member declaration
     */
    printStaticElements({clean}) {
        return createMember({
            name: 'elements',
            type: elementsOf(clean),
            isDeclare: !configuration.outputDTsFiles,
            isStatic: !configuration.outputDTsFiles,
            isReadonly: true
        })
    }

    /**
     * Prints an export statement for a symbol that is exported under an alias
     * @param {string} symbol - the name of the symbol to export
     * @param {string} alias - the singular inflection of the entity, containing both the normalised and non-normalised version of the singular name
     */
    printExportAs(symbol, alias) {
        return `export { ${symbol} as "${alias}" }`
    }

    /**
     * @param {string} comment - comment text after the "// "
     */
    printSingleLineComment(comment) {
        return `// ${comment}`
    }

    /**
     * @param {object} params - parameters object
     * @param {string} params.target - the target of the defineProperty call
     * @param {string} params.property - the property to define
     * @param {string} params.value - the value to define the property with
     */
    printDefineProperty({target, property, value}) {
        return `Object.defineProperty(${target}, '${property}', { value: ${value} })`
    }

    /**
     * @param {object} params - parameters
     * @param {string | string[]} [params.doc] - docstring
     * @param {string | string[]} params.body - body
     */
    printService({ doc, body }) {
        return [
            docify(doc),
            'export default class {',
            indent(body, 2),
            '}'
        ].join('\n')
    }

    /**
     * @param {object} params - parameters
     * @param {string} params.entityName - name of entity
     * @param {Buffer} params.body - properties of event
     */
    printEvent({entityName, body}) {
        return [
            this.printSingleLineComment('event'),
            `export declare class ${entityName} {`,
            indent(body.parts, 2),
            '}'
        ].join('\n')
    }
}

// for printing .ts files (--output_dts_files false)
class ImplementationPrinter extends TypeScriptPrinter{
    /** @type {TypeScriptPrinter['printAspectFunction']} */
    printAspectFunction (ctx) {
        return [
            `export function ${ctx.aspectFunctionName}<TBase extends new (...args: any[]) => object>(Base: TBase) {`,
            indent(ctx.body, 2),
            '}'
        ].join('\n')
    }

    /** @type {TypeScriptPrinter['printAspect']} */
    printAspect(ctx) {
        const props = ctx.properties?.parts?.length ? ctx.properties.join('\n') : ''
        const statics = ctx.staticMembers?.parts?.length ? ctx.staticMembers.join('\n') : ''
        const keysEtc = ctx.keysElementsActions?.parts?.length ? ctx.keysElementsActions.join('\n') : ''
        const classBody = [props, statics, keysEtc]
            .filter(Boolean)
            .join('\n')
        return [
            `return class ${ctx.clean} extends ${ctx.ancestorsAspects} {`,
            indent(classBody, 2),
            '};'
        ].join('\n')
    }

    /** @type {TypeScriptPrinter['printKindProperty']} */
    printKindProperty(ctx) {
        return createMember({
            name: 'kind',
            type: unionOf(...['entity', 'type', 'aspect'].map(stringIdent)),
            isStatic: true,
            isReadonly: true,
            isOverride: ctx.ancestorInfos?.some(({csn}) => csn.kind) ?? false,
            initialiser: stringIdent(ctx.entity?.kind ?? 'entity')
        })
    }

    /** @type {TypeScriptPrinter['printEnumConst']} */
    printEnumConst(ctx) {
        const { enquote } = require('../components/identifier')
        const entries = ctx.kvs.map(([k, v]) => `${enquote(k)}: ${v}`).join(', ')
        return `${ctx.isExported ? 'export ' : ''}const ${ctx.name} = { ${entries} } as const;`
    }
}

// for printing .d.ts files (--output_dts_files true)
class DeclarationPrinter extends TypeScriptPrinter {
    /** @type {TypeScriptPrinter['printAspectFunction']} */
    printAspectFunction (ctx) {
        const modifiers = ctx.isInNamespace ? 'export' : 'export declare'
        return [
            `${modifiers} function ${ctx.aspectFunctionName}<TBase extends new (...args: any[]) => object>(Base: TBase): {`,
            indent(ctx.body, 2),
            '};'
        ].join('\n')
    }

    /** @type {TypeScriptPrinter['printAspect']} */
    printAspect(ctx) {
        const props = ctx.properties?.parts?.length ? ctx.properties.join('\n') : ''
        const statics = ctx.staticMembers?.parts?.length ? ctx.staticMembers.join('\n') : ''
        const propertyBlock = props ? `{\n${indent(props, 2)}\n}` : '{}'
        const staticPropertyBlock = statics ? `{\n${indent(statics, 2)}\n}` : '{}'
        const keysEtc = ctx.keysElementsActions?.parts?.length ? ctx.keysElementsActions.join('\n') : ''
        const signature = `new (...args: any[]): ${propertyBlock} & ${staticPropertyBlock} & TBase`
        return keysEtc ? `${signature}\n${keysEtc}` : signature
    }

    /** @type {TypeScriptPrinter['printKindProperty']} */
    printKindProperty(ctx) {
        // In declaration signatures, static nature is expressed by structural position
        // not by the 'static' keyword
        return createMember({
            name: 'kind',
            type: stringIdent(ctx.entity?.kind ?? 'entity'),
            isStatic: false,
            isReadonly: true,
            isDeclare: false,
        })
    }

    /** @type {TypeScriptPrinter['printEnumConst']} */
    printEnumConst(ctx) {
        const { enquote } = require('../components/identifier')
        const entries = ctx.kvs.map(([k, v]) => `${enquote(k)}: ${v}`).join(',\n  ')
        return `${ctx.isExported ? 'export ' : ''}const ${ctx.name}: {\n  ${entries},\n}`
    }
}

/** @typedef {TypeScriptPrinter} Printer */

module.exports = {
    ImplementationPrinter,
    DeclarationPrinter
}