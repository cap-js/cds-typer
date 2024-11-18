class JavaScriptPrinter {
    printSingleLineComment (text) {
        return `// ${text}`
    }

    printConstant (name, value) {
        return `const ${name} = ${value}`
    }

    printImport (alias, from) {
        throw Error('not implemented')
    }

    printExport (value) {
        throw Error('not implemented')
    }

    nameFile (file) {
        throw Error('not implemented')
    }
}

class ESMPrinter extends JavaScriptPrinter {
    printImport (alias, from) {
        return `import * as ${alias} from '${from}'`
    }

    printExport (name, value) {
        return `export ${name} = ${value}`
    }

    nameFile (file) {
        return `${file}.mjs`
    }
}

class CJSPrinter extends JavaScriptPrinter {
    printImport (alias, from) {
        return `const ${alias} = require('${from}')`
    }

    printExport (name, value) {
        return `module.exports.${name} = ${value}`
    }

    nameFile (file) {
        return `${file}.js`
    }
}

module.exports = {
    CJSPrinter,
    ESMPrinter
}