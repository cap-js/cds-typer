/**
 * Forcefully overrides the .name property of a class.
 * See: https://github.com/microsoft/TypeScript/issues/442
 * @param {string} clazz - the class to override the name property for
 * @param {string} content - the content to set the name property to
 */
const overrideNameProperty = (clazz, content) => `Object.defineProperty(${clazz}, 'name', { value: '${content}' })`

class JavaScriptPrinter {
    /**
     * @param {string} text - comment text
     */
    printSingleLineComment (text) {
        return `// ${text}`
    }

    /**
     * @param {string} name - name of the constant
     * @param {string} value - initial assignment to the constant
     */
    printConstant (name, value) {
        return `const ${name} = ${value}`
    }

    /**
     * @abstract
     * @param {string} alias - what the import should be known as within the importing file
     * @param {string} from - the package/ location to import from
     * @returns {string}
     */
    // eslint-disable-next-line no-unused-vars
    printImport (alias, from) {
        throw Error('not implemented')
    }

    /**
     * @abstract
     * @param {string[]} imports - the deconstructed elements
     * @param {string} from - the package/ location to import from
     * @returns {string}
     */
    // eslint-disable-next-line no-unused-vars
    printDeconstructedImport (imports, from) {
        throw Error('not implemented')
    }

    /**
     * @abstract
     * @param {string} name - name the export should be known as
     * @param {string} value - the value of the export
     * @returns {string}
     */
    // eslint-disable-next-line no-unused-vars
    printExport (name, value) {
        throw Error('not implemented')
    }

    /**
     * @abstract
     * @param {string} value - the value of the default export
     * @returns {string}
     */
    // eslint-disable-next-line no-unused-vars
    printDefaultExport (value) {
        throw Error('not implemented')
    }

    /**
     * @abstract
     * @param {string} file - the file name without extension
     * @returns {string}
     */
    // eslint-disable-next-line no-unused-vars
    nameFile (file) {
        throw Error('not implemented')
    }
}

class ESMPrinter extends JavaScriptPrinter {
    /** @type {JavaScriptPrinter['printImport']} */
    printImport (alias, from) {
        return `import * as ${alias} from '${from}'`
    }

    /** @type {JavaScriptPrinter['printDeconstructedImport']} */
    printDeconstructedImport (imports, from) {
        return `import { ${imports.join(', ')} } from '${from}/index.js'`
    }

    /** @type {JavaScriptPrinter['printExport']} */
    printExport (name, value) {
        return name.includes('.')
            ? `${name} = ${value}`
            : `export const ${name} = ${value}`
    }

    /** @type {JavaScriptPrinter['printDefaultExport']} */
    printDefaultExport (value) {
        return `export default ${value}`
    }

    /** @type {JavaScriptPrinter['nameFile']} */
    nameFile (file) {
        return `${file}.mjs`
    }
}

class CJSPrinter extends JavaScriptPrinter {
    /** @type {JavaScriptPrinter['printImport']} */
    printImport (alias, from) {
        return `const ${alias} = require('${from}')`
    }

    /** @type {JavaScriptPrinter['printDeconstructedImport']} */
    printDeconstructedImport (imports, from) {
        return `const { ${imports.join(', ')} } = require('${from}')`
    }

    /** @type {JavaScriptPrinter['printExport']} */
    printExport (name, value) {
        return `module.exports.${name} = ${value}`
    }

    /** @type {JavaScriptPrinter['printDefaultExport']} */
    printDefaultExport (value) {
        // not exactly "default", but you catch the drift...
        return `module.exports = ${value}`
    }

    /** @type {JavaScriptPrinter['nameFile']} */
    nameFile (file) {
        return `${file}.js`
    }
}

/** @typedef {JavaScriptPrinter} Printer */

module.exports = {
    CJSPrinter,
    ESMPrinter,
    overrideNameProperty
}