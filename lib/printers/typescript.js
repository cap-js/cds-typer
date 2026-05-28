const { createMember } = require('../components/class')
const { stringIdent, createUnionOf } = require('./wrappers')

/** @typedef {import('../typedefs').printer.PrintContext} PrintContext */

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

}

class ImplementationPrinter extends TypeScriptPrinter{
    /** @type {TypeScriptPrinter['printAspectFunction']} */
    printAspectFunction (ctx) {
        return `export function ${ctx.aspectFunctionName}<TBase extends new (...args: any[]) => object>(Base: TBase) {`
    }

    /** @type {TypeScriptPrinter['printAspect']} */
    printAspect(ctx) {
        return `return class ${ctx.clean} extends ${ctx.ancestorsAspects} {`
    }

    /** @type {TypeScriptPrinter['printKindProperty']} */
    printKindProperty(ctx) {
        return createMember({
            name: 'kind',
            type: createUnionOf(...['entity', 'type', 'aspect'].map(stringIdent)),
            isStatic: true,
            isReadonly: true,
            isDeclare: true,
            isOverride: ctx.ancestorInfos?.some(({csn}) => csn.kind) ?? false,
            initialiser: stringIdent(ctx.entity?.kind ?? 'entity')
        })
    }
}

class DeclarationPrinter extends TypeScriptPrinter {
    /** @type {TypeScriptPrinter['printAspectFunction']} */
    printAspectFunction (ctx) {
        const modifiers = ctx.isInNamespace ? 'export' : 'export declare '
        return `${modifiers} function ${ctx.aspectFunctionName}<TBase extends new (...args: any[]) => object>(Base: TBase): {`
    }

    /** @type {TypeScriptPrinter['printAspect']} */
    printAspect(ctx) {
        const members = ctx.properties?.parts?.length
            ? `{\n${ctx.properties.join('\n')}\n}`
            : '{}'
        const statics = ctx.staticMembers?.parts?.length
            ? `{\n${ctx.staticMembers.join('\n')}\n}`
            : '{}'
        return `new (...args: any[]): ${members} & ${statics} & TBase`
    }

    /** @type {TypeScriptPrinter['printKindProperty']} */
    printKindProperty(ctx) {
        return createMember({
            name: 'kind',
            type: stringIdent(ctx.entity?.kind ?? 'entity'),
            isStatic: true,
            isReadonly: true,
            isDeclare: true,
        })
    }
}

/** @typedef {TypeScriptPrinter} Printer */

module.exports = {
    ImplementationPrinter,
    DeclarationPrinter
}