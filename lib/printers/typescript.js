const { createMember } = require('../components/class')
const { stringIdent, createUnionOf } = require('./wrappers')

class TypeScriptPrinter {
    /**
     * @abstract
     * @param {string} aspectFunctionName - the name of the aspect function to print
     * @returns {string} the aspect function declaration
     */
    // eslint-disable-next-line no-unused-vars
    printAspectFunction (aspectFunctionName) {
        throw Error('not implemented')
    }

    /**
     * @abstract
     * @param {string} clean - the cleaned name of the aspect
     * @param {string} ancestorAspects - the list of ancestor aspects to extend
     * @returns {string}
     */
    // eslint-disable-next-line no-unused-vars
    printAspect(clean, ancestorAspects) {
        throw Error('not implemented')
    }


    /**
     * @abstract
     * @param {import('../typedefs').resolver.EntityCSN} entity - entity
     * @param {import('../typedefs').resolver.EntityInfo[]} ancestorInfos - list of ancestor entity infos to check for overrides
     * @returns {string}
     */
    // eslint-disable-next-line no-unused-vars
    printKindProperty(entity, ancestorInfos) {
        throw Error('not implemented')
    }

}

class ImplementationPrinter extends TypeScriptPrinter{
    /** @type {TypeScriptPrinter['printAspectFunction']} */
    printAspectFunction (aspectFunctionName) {
        return `export function ${aspectFunctionName}<TBase extends new (...args: any[]) => object>(Base: TBase) {`
    }

    /** @type {TypeScriptPrinter['printAspect']} */
    printAspect(clean, ancestorAspects) {
        return `return class ${clean} extends ${ancestorAspects} {`
    }

    /** @type {TypeScriptPrinter['printKindProperty']} */
    printKindProperty(entity, ancestorInfos) {
        return createMember({
            name: 'kind',
            type: createUnionOf(...['entity', 'type', 'aspect'].map(stringIdent)),
            isStatic: true,
            isReadonly: true,
            isDeclare: true,
            isOverride: ancestorInfos.some(({csn}) => csn.kind),
            initialiser: stringIdent(entity.kind)
        })
    }
}

class DeclarationPrinter extends TypeScriptPrinter {
    /** @type {TypeScriptPrinter['printAspectFunction']} */
    printAspectFunction (aspectFunctionName, isInNamespace) {
        const modifiers = isInNamespace ? 'export' : 'export declare '
        return `${modifiers} function ${aspectFunctionName}<TBase extends new (...args: any[]) => object>(Base: TBase): {`
    }

    /** @type {TypeScriptPrinter['printAspect']} */
    printAspect(clean, properties, staticMembers, ancestorAspects) {
        const members = properties?.parts.length > 0 ? `{\n${(properties??[]).join('\n')}\n}` : '{}'
        const statics = staticMembers?.length > 0 ? `{\n${(staticMembers??[]).join('\n')}\n}` : '{}'
        return `new (...args: any[]): ${members} & ${statics} & TBase`
    }

    /** @type {TypeScriptPrinter['printKindProperty']} */
    printKindProperty(entity) {
        return createMember({
            name: 'kind',
            type: stringIdent(entity.kind),
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