const ts = require('typescript')

const defaultTranspilationOptions = {
    noEmit: true,
    esModuleInterop: true,
    strict: true,
    noImplicitOverride: true,
    lib: ['es2022'],  // to allow Object.hasOwn
}

/**
 * Checks a parsed TS program for error diagnostics.
 * @param {any} program - the parsed TS program
 */
function checkProgram (program) {
    const emitResult = program.emit()
    const diagnostics = ts.getPreEmitDiagnostics(program).concat(emitResult.diagnostics)

    const errors = diagnostics.map(diag => {
        const message = ts.flattenDiagnosticMessageText(diag.messageText, '\n')
        // ignore errors that are caused by Object.hasOwn
        // this SHOULD be addressed by passing lib: [es2022], but for some reason, it is not.
        if (message.includes('hasOwn')) return undefined
        // ignore errors that were caused by dependencies
        if (diag.file && diag.file.fileName.indexOf('node_modules') === -1) {
            const { line } = diag.file.getLineAndCharacterOfPosition(diag.start)
            return `${diag.file.fileName}:${line + 1}: ${message}`
        }
        return undefined
    }).filter(Boolean)

    if (errors.length) {
        throw new Error(`Several errors occurred during the compilation of the generated types:\n${errors.join('\n')}`)
    }
}

/**
 * Parses a list of .ts files, and checks them for errors.
 * @param {string[]} apiFiles - the list of .ts files to check
 * @param {import('typescript').CompilerOptions} opts - the options to pass to the TS compiler
 */
async function checkTranspilation (apiFiles, opts = {}) {
    const options = {...defaultTranspilationOptions, ...opts}
    const program = ts.createProgram({ rootNames: apiFiles, options })
    checkProgram(program)
}

module.exports = {
    checkTranspilation
}