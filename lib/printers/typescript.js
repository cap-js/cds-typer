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
}

class DeclarationPrinter extends TypeScriptPrinter {

}

module.exports = {
    ImplementationPrinter,
    DeclarationPrinter
}