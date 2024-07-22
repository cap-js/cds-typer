'use strict'

const fs = require('fs').promises
const path = require('path')
const { readFileSync } = require('fs')
const { printEnum, propertyToInlineEnumName, stringifyEnumImplementation } = require('./components/enum')
const { normalise } = require('./components/identifier')
const { empty } = require('./components/typescript')
const { createObjectOf } = require('./components/wrappers')

const AUTO_GEN_NOTE = '// This is an automatically generated file. Please do not change its contents manually!'

/** @typedef {import('./typedefs').file.Namespace} Namespace */

class File {
    /**
     * Creates one string from the buffers representing the type definitions.
     * @returns {string} complete file contents.
     */
    toTypeDefs() { return '' }

    /**
     * Concats the classnames to an export dictionary
     * to create the accompanying JS file for the typings.
     * @returns {string} a string containing the module.exports for the JS file.
     */
    toJSExports() { return '' }
}

/**
 * Library files that contain predefined types.
 * For example, the cap.hana types are included in a separate predefined library file
 * which is only included if the model that is being compiled references any of these types.
 * A library is uniquely identified by the namespace it represents. That namespace is directly
 * derived from the file's name. i.e. path/to/file/cap.hana.ts will be considered to hold
 * definitions describing the namespace "cap.hana".
 * These files are supposed to contain fully usable types, not CSN or a CDS file, as they are just
 * being copied verbatim when they are being used.
 */
class Library extends File {
    toTypeDefs() {
        return this.contents
    }

    constructor(file) {
        super()
        this.contents = readFileSync(file, 'utf-8')
        /**
         * The path to the file where the lib definitions are stored (some/path/name.space.ts)
         * @type {string}
         * @private
         */
        this.file = file

        /**
         * List of entity names (plain, without namespace)
         * @type {string[]}
         */
        this.entities = Array.from(this.contents.matchAll(/export class (\w+)/g), ([,m]) => m)

        /**
         * Namespace (a.b.c.d)
         * @type {string}
         */
        this.namespace = path.basename(file, '.ts')

        /**
         * Whether this library was referenced at least once
         * @type {boolean}
         */
        this.referenced = false

        /**
         * The Path for this library file, which is constructed from its namespace.
         * @type {Path}
         */
        this.path = new Path(this.namespace.split('.'))
    }

    /**
     * Whether this library offers an entity of a given type (fully qualified).
     * @param {string} entity - the entity's name, e.g. cap.hana.TINYINT
     * @returns {boolean} true, iff the namespace inferred from the passed string matches that of this library
     *          and this library contains a class of that name. i.e.:
     *          ```js
     *          new Library('cap.hana.ts').offers('cap.hana.TINYINT') // -> true`
     *          ```
     */
    offers(entity) {
        return this.entities.some(e => `${this.namespace}.${e}` === entity)
    }
}

/**
 * Source file containing several buffers.
 */
class SourceFile extends File {
    /**
     * @param {string | Path} path - path to the file
     */
    constructor(path) {
        super()
        /** @type {Path} */
        this.path = path instanceof Path ? path : new Path(path.split('.'))
        /** @type {object} */
        this.imports = {}
        /** @type {Buffer} */
        this.preamble = new Buffer()
        /** @type {{ buffer: Buffer, fqs: {name: string, fq: string}[]}} */
        this.events = { buffer: new Buffer(), fqs: []}
        /** @type {Buffer} */
        this.types = new Buffer()
        /** @type {{ buffer: Buffer, data: {kvs: [string[]], name: string, fq: string, property?: string}[]}} */
        this.enums = { buffer: new Buffer(), data: [] }
        /** @type {{ buffer: Buffer }} */
        this.inlineEnums = { buffer: new Buffer() }
        /** @type {Buffer} */
        this.classes = new Buffer()
        /** @type {{ buffer: Buffer, names: string[]}} */
        this.operations = { buffer: new Buffer(), names: [] }
        /** @type {Buffer} */
        this.aspects = new Buffer()
        /** @type {Namespace} */
        this.namespaces = {}
        /** @type {{[key: string]: any}} */
        this.classNames = {} // for .js file
        /** @type {{[key: string]: any}} */
        this.typeNames = {}
        /** @type {[string, string, string][]} */
        this.inflections = []
        /** @type {{ buffer: Buffer, names: string[]}} */
        this.services = { buffer: new Buffer(), names: [] }
    }

    /**
     * Stringifies a lambda expression.
     * @param {{name: string, parameters: [string, string][], returns: string, initialiser: string}} param - name, parameters, return type, and initialiser expression
     * @returns {string} - the stringified lambda
     * @example
     * ```js
     * // note: these samples are actually simplified! See below.
     * stringifyLambda({parameters: [['p','T']]})  // f: { (p: T): any, ... }
     * stringifyLambda({name: 'f', parameters: [['p','T']]})  // f: { (p: T) => any, ...  }
     * stringifyLambda({name: 'f', parameters: [['p','T']], returns: 'number'})  // f: { (p: T) => number, ...  }
     * stringifyLambda({name: 'f', parameters: [['p','T']], returns: 'number', initialiser: '_ => 42'})  // f: { (p: T): string = _ => 42, ...  }
     * ```
     *
     * The generated string will not be just the signature of the function. Instead, it will be an object offering a callable signature.
     * On top of that, it will also expose a property `__parameters`, which is an object reflecting the functions parameters.
     * The reason for this is that the CDS runtime actually treats the function parameters as a named object. This can not be rectified via
     * type magic, as parameter names do not exist on type level. So we can not use these names to reuse them as object properties.
     * Instead, we generate this utility object for the runtime to use:
     * @example
     * ```js
     * stringifyLambda({name: 'f', parameters: [['p','T']], returns: 'number'})  // { (p: T): number, __parameters: { p: T } }
     * ```
     */
    static stringifyLambda({name, parameters=[], returns='any', initialiser, isStatic=false, kind}) {
        const parameterTypes = parameters.map(([n, t]) => `${normalise(n)}: ${t}`).join(', ')
        const parameterTypeAsObject = parameterTypes.length
            ? createObjectOf(parameterTypes)
            : empty
        const callableSignature = `(${parameterTypes}): ${returns}`
        let prefix = name ? `${normalise(name)}: `: ''
        if (prefix && isStatic) {
            prefix = `static ${prefix}`
        }
        const kindDef = kind ? `, kind: '${kind}'` : ''
        const suffix = initialiser ? ` = ${initialiser}` : ''
        const lambda = `{ ${callableSignature}, __parameters: ${parameterTypeAsObject}, __returns: ${returns}${kindDef}}`
        return prefix + lambda + suffix
    }

    /**
     * Adds a pair of singular and plural inflection.
     * These are later used to generate the singular -> plural
     * aliases in the index.js file.
     * @param {string} singular - singular type without namespace.
     * @param {string} plural - plural type without namespace
     * @param {string} original - original entity name without namespace.
     *        In many cases this will be the same as plural.
     */
    addInflection(singular, plural, original) {
        this.inflections.push([singular, plural, original])
    }

    /**
     * Adds a function definition in form of a arrow function to the file.
     * @param {string} name - name of the function
     * @param {{relative: string | undefined, local: boolean, posix: boolean}} parameters - list of parameters, passed as [name, type] pairs
     * @param {string} returns - the return type of the function
     * @param {'function' | 'action'} kind - kind of the node
     */
    addOperation(name, parameters, returns, kind) {
        //this.operations.buffer.add("// operation")
        this.operations.buffer.add(`export declare const ${SourceFile.stringifyLambda({name, parameters, returns, kind})};`)
        this.operations.names.push(name)
    }

    /**
     * Retrieves or creates and retrieves a sub namespace
     * with a given name.
     * @param {string} name - of the sub namespace.
     * @returns {Namespace} the sub namespace.
     */
    getSubNamespace(name) {
        if (!(name in this.namespaces)) {
            const buffer = new Buffer()
            buffer.closed = false
            buffer.add(`export namespace ${name} {`)
            buffer.indent()
            this.namespaces[name] = buffer
        }
        const buffer = this.namespaces[name]
        if (buffer.closed) {
            throw new Error(`Tried to add content to namespace buffer '${name}' that was already closed.`)
        }
        return this.namespaces[name]
    }

    /**
     * Adds an enum to this file.
     * @param {string} fq - fully qualified name of the enum (entity name within CSN)
     * @param {string} name - local name of the enum
     * @param {[string, string][]} kvs - list of key-value pairs
     * @param {string?} _property - property to which the enum is attached.
     *  If given, the enum is considered to be an inline definition of an enum.
     *  If not, it is considered to be regular, named enum.
     */
    addEnum(fq, name, kvs, _property) {
        this.enums.data.push({ name, fq, kvs })
        printEnum(this.enums.buffer, name, kvs)
    }

    /**
     * Adds an inline enum to this file.
     * @param {string} entityCleanName - name of the entity the enum is attached to without namespace
     * @param {string} entityFqName - name of the entity the enum is attached to with namespace
     * @param {string} propertyName - property to which the enum is attached.
     * @param {[string, string][]} kvs - list of key-value pairs
     *  If given, the enum is considered to be an inline definition of an enum.
     *  If not, it is considered to be regular, named enum.
     * @example
     * ```js
     * addInlineEnum('Books.genre', 'Books', 'genre', [['horror','horror']])
     * ```
     * generates
     * ```js
     * // index.js
     * module.exports.Books.genre = F(cds.model.definitions['Books'].elements.genre.enum)
     * // F(...) is a function that maps a CSN enum to a more convenient style
     * ```
     * and also
     * ```ts
     * // index.ts
     * const Books_genre = { horror: 'horror' }
     * type Books_genre = 'horror'
     * class Book {
     *   static genre = Books_genre
     *   genre: Books_genre
     * }
     * ```
     */
    addInlineEnum(entityCleanName, entityFqName, propertyName, kvs) {
        this.enums.data.push({
            name: `${entityCleanName}.${propertyName}`,
            property: propertyName,
            kvs,
            fq: `${entityCleanName}.${propertyName}`
        })
        printEnum(this.inlineEnums.buffer, propertyToInlineEnumName(entityCleanName, propertyName), kvs, {export: false})
    }

    /**
     * Adds a class to this file.
     * This differs from writing to the classes buffer,
     * as it is just a cache to collect all classes that
     * are supposed to be present in this file.
     * @param {string} clean - cleaned name of the class
     * @param {string} fq - fully qualified name, including the namespace
     */
    addClass(clean, fq) {
        this.classNames[clean] = fq
    }

    /**
     * Adds an event to this file.
     * are supposed to be present in this file.
     * @param {string} name - cleaned name of the event
     * @param {string} fq - fully qualified name, including the namespace
     */
    addEvent(name, fq) {
        this.events.fqs.push({ name, fq })
    }

    /**
     * Adds an import if it does not exist yet.
     * @param {Path} imp - qualifier for the namespace to import.
     */
    addImport(imp) {
        const dir = imp.asDirectory({relative: this.path.asDirectory()})
        if (!(dir in this.imports)) {
            this.imports[dir] = imp
        }
    }

    /**
     * Adds an arbitrary piece of code that is added
     * right after the imports.
     * @param {string} code - the preamble code.
     */
    addPreamble(code) {
        this.preamble.add(code)
    }

    /**
     * Adds a type alias to this file.
     * @param {string} fq - fully qualified name of the enum
     * @param {string} clean - local name of the enum
     * @param {string} rhs - the right hand side of the assignment
     * @param {boolean} exportValueLevel - whether to export the value level of the type (relevant to enums)
     */
    addType(fq, clean, rhs, exportValueLevel = false) {
        this.typeNames[clean] = fq
        this.types.add(`export type ${clean} = ${rhs};`)
        if (exportValueLevel) {
            this.types.add(`export const ${clean} = ${rhs};`)
        }
    }

    /**
     * Adds a service to the file.
     * We consider each service its own distinct namespace and therefore expect
     * at most one service per file.
     * @param {string} fq - the fully qualified name of the service
     */
    addService(fq) {
        // FIXME: warn the user when they're trying to add an entity/ type/ enum called "name", which will override our name export
        if (this.services.names.length) {
            throw new Error(`trying to add more than one service to file ${this.path.asDirectory()}. Existing service is ${this.services.names[0]}, trying to add ${fq}`)
        }
        this.services.names.push(fq)
    }

    /**
     * Writes all imports to a buffer, relative to the current file.
     * Creates a new buffer on each call, as concatenating import strings directly
     * upon discovering them would complicate filtering out duplicate entries.
     * @returns {Buffer} all imports written to a buffer.
     */
    getImports() {
        const buffer = new Buffer()
        for (const imp of Object.values(this.imports)) {
            if (!imp.isCwd(this.path.asDirectory())) {
                buffer.add(`import * as ${imp.asIdentifier()} from '${imp.asDirectory({relative: this.path.asDirectory()})}';`)
            }
        }
        return buffer
    }

    toTypeDefs() {
        const namespaces = new Buffer()
        for (const ns of Object.values(this.namespaces)) {
            ns.outdent()
            ns.add('}')
            ns.closed = true
            namespaces.add(ns.join())
        }
        return [
            AUTO_GEN_NOTE,
            this.getImports().join(),
            this.preamble.join(),
            this.services.buffer.join(), // must be the very first
            this.types.join(),
            this.enums.buffer.join(),
            this.inlineEnums.buffer.join(), // needs to be before classes
            this.aspects.join(), // needs to be before classes
            this.classes.join(),
            this.events.buffer.join(),
            this.operations.buffer.join(),
            namespaces.join()  // needs to be after classes for possible declaration merging
        ].filter(Boolean).join('\n')
    }

    toJSExports() {
        return [AUTO_GEN_NOTE, 'const cds = require(\'@sap/cds\')', `const csn = cds.entities('${this.path.asNamespace()}')`] // boilerplate
            .concat(
                // FIXME: move stringification of service into own module
                this.services.names.map(name => `module.exports = { name: '${name}' }`))  // there should be only one
            .concat(this.inflections
            // sorting the entries based on the number of dots in their singular.
            // that makes sure we have defined all parent namespaces before adding subclasses to them e.g.:
            // "module.exports.Books" is defined before "module.exports.Books.text"
                .sort(([a], [b]) => a.split('.').length - b.split('.').length)
                .flatMap(([singular, plural, original]) => {
                    const exports = [`module.exports.${singular} = { is_singular: true, __proto__: csn.${original} }`]
                    if (!/Array<.*>/.test(plural) && plural !== original) {
                        // FIXME: this is a hack to support CDS types that will produce "Array<MyType>" as plural, which we do not want as export in the index.js files
                        exports.push(`module.exports.${plural} = csn.${original}`)
                    }
                    // FIXME: we currently produce at most 3 entries.
                    // This could be an issue when the user re-used the original name in a @singular/@plural annotation.
                    // Seems unlikely, but we have to eliminate the original entry if users start running into this.
                    if (singular !== original) {
                        // do not do the is_singular spiel if the original name is used for the plural
                        const rhs = plural === original
                            ? `csn.${original}`
                            : `{ is_singular: true, __proto__: csn.${original} }`
                        exports.push(`module.exports.${original} = ${rhs}`)
                    }
                    return exports
                })
            ) // singular -> plural aliases
            .concat(['// events'])
            .concat(this.events.fqs.map(({fq, name}) => `module.exports.${name} = '${fq}'`))
            .concat(['// actions'])
            .concat(this.operations.names.map(name => `module.exports.${name} = '${name}'`))
            .concat(['// enums'])
            .concat(this.enums.data.map(({name, kvs}) => stringifyEnumImplementation(name, kvs)))
            .join('\n') + '\n'
    }
}

/**
 * String buffer to conveniently append strings to.
 */
class Buffer {

    /**
     * @param {string} indentation - indentation to use (two spaces by default)
     */
    constructor(indentation = '  ') {
        /**
         * @type {string[]}
         */
        this.parts = []
        /**
         * @type {string}
         */
        this.indentation = indentation
        /**
         * @type {string}
         */
        this.currentIndent = ''
    }

    /**
     * Indents by the predefined spacing.
     */
    indent() {
        this.currentIndent += this.indentation
    }

    /**
     * Removes one level of indentation.
     */
    outdent() {
        if (this.currentIndent.length === 0) {
            throw new Error('Can not outdent buffer further. Probably mismatched indent.')
        }
        this.currentIndent = this.currentIndent.slice(0, -this.indentation.length)
    }

    /**
     * Concats all elements in the buffer into a single string.
     * @param {string} glue - string to intersperse all buffer contents with
     * @returns {string} string spilled buffer contents.
     */
    join(glue = '\n') {
        return this.parts.join(glue)
    }

    /**
     * Clears the buffer.
     */
    clear() {
        this.parts = []
    }

    /**
     * Adds an element to the buffer with the current indentation level.
     * @param {string} part  - what to attach to the buffer
     */
    add(part) {
        this.parts.push(this.currentIndent + part)
    }

    /**
     * Adds an element to the buffer with one level of indent.
     * @param {string | (() => void)} part - either a string or a function. If it is a string, it is added to the buffer.
     * If not, it is expected to be a function that manipulates the buffer as a side effect.
     */
    addIndented(part) {
        this.indent()
        if (typeof part === 'function') {
            part()
        } else if (Array.isArray(part)) {
            part.forEach(p => { this.add(p) })
        }
        this.outdent()
    }

    /**
     * Adds an element to a buffer with one level of indent and and opener and closer surrounding it.
     * @param {string} opener - the string to put before the indent
     * @param {string} content - the content to indent (see {@link addIndented})
     * @param {string} closer - the string to put after the indent
     */
    addIndentedBlock(opener, content, closer) {
        this.add(opener)
        this.addIndented(content)
        this.add(closer)
    }
}

/**
 * Convenience class to handle path qualifiers.
 */
class Path {

    /**
     * @param {string[]} parts - parts of the path. 'a.b.c' -> ['a', 'b', 'c']
     * @param {string} kind - FIXME: currently unused
     */
    constructor(parts, kind) {
        this.parts = parts
        this.kind = kind
    }

    /**
     * @returns {Path} the path to the parent directory. 'a.b.c'.getParent() -> 'a.b'
     */
    getParent() {
        return new Path(this.parts.slice(0, -1))
    }

    /**
     * Transfoms the Path into a directory path.
     * @param {object} params - parameters
     * @param {string?} params.relative - if defined, the path is constructed relative to this directory
     * @param {boolean} params.local - if set to true, './' is prefixed to the directory
     * @param {boolean} params.posix - if set to true, all slashes will be forward slashes on every OS. Useful for require/ import
     * @returns {string} directory 'a.b.c'.asDirectory() -> 'a/b/c' (or a\b\c when on Windows without passing posix = true)
     */
    asDirectory(params = {}) {
        const { relative, local, posix } = {relative: undefined, local: true, posix: true, ...params}
        const sep = posix ? path.posix.sep : path.sep
        const prefix = local ? `.${sep}` : ''
        const absolute = path.join(...this.parts)
        let p = relative ? path.relative(relative, absolute) : absolute
        if (posix) {
            // NOTE: this could fail for absolute paths (D:\\...) or network drives on windows
            p = p.split(path.sep).join(path.posix.sep)
        }
        // path.join removes leading ./, so we have to concat manually here
        return prefix + p
    }

    /**
     * Transforms the Path into a namespace qualifier.
     * @returns {string} namespace qualifier 'a.b.c'.asNamespace() -> 'a.b.c'
     */
    asNamespace() {
        return this.parts.join('.')
    }

    /**
     * Transforms the Path into an identifier that can be used as variable name.
     * @returns {string} identifier 'a.b.c'.asIdentifier() -> '_a_b_c', ''.asIdentifier() -> '_'
     */
    asIdentifier() {
        return `_${this.parts.join('_')}`
    }

    /**
     * @param {string} relative - directory to which we check relatively
     * @returns {boolean} true, iff the Path refers to the current working directory, aka './'
     */
    isCwd(relative = undefined) {
        return (!relative && this.parts.length === 0) || (!!relative && this.asDirectory({relative}) === './')
    }
}

// TODO: having the repository pattern in place we can separate (some of) the printing logic from the visitor.
// Most of it hinges primarily on resolving specific files. We can now pass the repository and the resolver to a printer.
class FileRepository {
    #files = {}

    /**
     * @param {string} name - file name
     * @param {SourceFile} file - the file
     */
    add(name, file) {
        this.#files[name] = file
    }

    /**
     * Determines the file corresponding to the namespace.
     * If no such file exists yet, it is created first.
     * @param {string | Path} path - the name of the namespace (foo.bar.baz)
     * @returns {SourceFile} the file corresponding to that namespace name
     */
    getNamespaceFile(path) {
        const key = path instanceof Path ? path.asNamespace() : path
        return (this.#files[key] ??= new SourceFile(path))
    }

    /**
     * @returns {SourceFile[]}
     */
    getFiles() {
        return Object.values(this.#files)
    }
}

/**
 * Writes the files to disk. For each source, a index.d.ts holding the type definitions
 * and a index.js holding implementation stubs is generated at the appropriate directory.
 * Missing directories are created automatically and asynchronously.
 * @param {string} root - root directory to prefix all directories with
 * @param {File[]} sources - source files to write to disk
 * @returns {Promise<string[]>} Promise that resolves to a list of all directory paths pointing to generated files.
 */
const writeout = async (root, sources) =>
    Promise.all(
        sources.map(async source => {
            const dir = path.join(root, source.path.asDirectory({local: false, posix: false}))
            try {
                await fs.mkdir(dir, { recursive: true })
                await Promise.all([
                    fs.writeFile(path.join(dir, 'index.ts'), source.toTypeDefs()),
                    fs.writeFile(path.join(dir, 'index.js'), source.toJSExports()),
                ])

            } catch (err) {
                // eslint-disable-next-line no-console
                console.error(`Could not create parent directory ${dir}: ${err}.`)
                // eslint-disable-next-line no-console
                console.error(err.stack)
            }
            return dir
        })
    )

module.exports = {
    Library,
    Buffer,
    File,
    FileRepository,
    SourceFile,
    Path,
    writeout
}
