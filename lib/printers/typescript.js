const { createMember } = require('../components/class')
const { stringIdent, createUnionOf } = require('./wrappers')

/** @typedef {import('../typedefs').printer.PrintContext} PrintContext */

/**
 * Indent each line of a string by a specified number of spaces
 * @param {string} [str] - the string to indent
 * @param {number} spaces - number of spaces to indent
 * @returns {string} indented string
 */
function indent(str, spaces = 2) {
    if (!str) return ''
    const indentation = ' '.repeat(spaces)
    return str.split('\n').map(line => line ? indentation + line : line).join('\n')
}

class TypeScriptPrinter {
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

}

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
            type: createUnionOf(...['entity', 'type', 'aspect'].map(stringIdent)),
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

class DeclarationPrinter extends TypeScriptPrinter {
    /** @type {TypeScriptPrinter['printAspectFunction']} */
    printAspectFunction (ctx) {
        const modifiers = ctx.isInNamespace ? 'export' : 'export declare '
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