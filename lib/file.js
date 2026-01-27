'use strict'

const fs = require('fs').promises
const path = require('path')
const { readFileSync } = require('fs')
const { printEnum, propertyToInlineEnumName, stringifyEnumImplementation } = require('./components/enum')
const { enquote } = require('./components/identifier')
const { empty } = require('./components/typescript')
const { proxyAccessFunction } = require('./components/javascript')
const { createObjectOf, stringIdent } = require('./printers/wrappers')
const { configuration } = require('./config')
const { CJSPrinter, ESMPrinter } = require('./printers/javascript')

const AUTO_GEN_NOTE = '// This is an automatically generated file. Please do not change its contents manually!'

/** @typedef {import('./typedefs').file.Namespace} Namespace */

class File {
    /**
     * The Path for this library file, which is constructed from its namespace.
     * @type {Path}
     */
    // @ts-expect-error - not initialised, but will be done in subclasses (can't make File abstract in JS)
    path

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

    /**
     * @param {string} file - path to the file
     */
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
    /** @type {import('../lib/printers/javascript').Printer | undefined} */
    #jsPrinter

    /**
     * @param {string | Path} path - path to the file
     */
    constructor(path) {
        super()
        /** @type {Path} */
        this.path = path instanceof Path ? path : new Path(path.split('.'))
        /** @type {{[key:string]: any}} */
        this.imports = {}
        /** @type {Buffer} */
        this.preamble = new Buffer()
        /** @type {{ buffer: Buffer, fqs: {name: string, fq: string}[]}} */
        this.events = { buffer: new Buffer(), fqs: []}
        /** @type {Buffer} */
        this.types = new Buffer()
        /** @type {{ buffer: Buffer, data: {kvs: [string, string][], name: string, fq: string, property?: string}[]}} */
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
        /** @type {{singular: string, plural: string, original: string, isNormalised: boolean}[]} */
        this.inflections = []
        /** @type {{ buffer: Buffer, names: string[]}} */
        this.services = { buffer: new Buffer(), names: [] }
        /** @type {Record<string,string[]>} */
        this.entityProxies = {}
    }

    get jsPrinter () {
        return this.#jsPrinter ??= configuration.targetModuleType === 'esm'
            ? new ESMPrinter()
            : new CJSPrinter()
    }

    /**
     * Stringifies a lambda expression.
     * @param {object} options - options
     * @param {string} options.name - name of the lambda
     * @param {import('./typedefs').visitor.ParamInfo[]} [options.parameters] - list of parameters, passed as [name, modifier, type, doc] pairs
     * @param {string} [options.returns] - the return type of the function
     * @param {string} [options.self] - what is set as "__self", which is used for bound actions. For unbound actions, this will be `never` (null would lead to incorrect type reduction)
     * @param {'action' | 'function'} options.kind - kind of the lambda
     * @param {string} [options.initialiser] - the initialiser expression
     * @param {boolean} [options.isStatic] - whether the lambda is static
     * @param {{positional?: boolean, named?: boolean}} [options.callStyles] - whether to generate positional and/or named call styles
     * @param {string[]?} [options.doc] - documentation for the operation
     * @returns {[string,string[],string]} the stringified lambda parts
     * @example
     * ```js
     * // note: these samples are actually simplified! See below.
     * stringifyLambda({parameters: [['p','','T']]})  // f: { (p: T): any, ... }
     * stringifyLambda({name: 'f', parameters: [{name:'p',type:'T'}]})  // f: { (p: T) => any, ...  }
     * stringifyLambda({name: 'f', parameters: [{name:'p',modifier:'?',type:'T',doc:'/** doc *\/'}], returns: 'number'})  // /** doc *\/f?: { (p: T) => number, ...  }
     * stringifyLambda({name: 'f', parameters: [{name:'p',type:'T'}], returns: 'number', initialiser: '_ => 42'})  // f?: { (p: T): string = _ => 42, ...  }
     * ```
     *
     * The generated string will not be just the signature of the function. Instead, it will be an object offering callable signature(s).
     * On top of that, it will also expose a property `__parameters`, which is an object reflecting the functions parameters.
     * The reason for this is that the CDS runtime actually treats the function parameters as a named object. This can not be rectified via
     * type magic, as parameter names do not exist on type level. So we can not use these names to reuse them as object properties.
     * Instead, we generate this utility object for the runtime to use:
     * @example
     * ```js
     * stringifyLambda({name: 'f', parameters: [{name:'p',type:'T'}], returns: 'number'})  // { (p: T): number, __parameters: { p: T } }
     * ```
     */
    static stringifyLambda({name, parameters=[], returns='any', kind, initialiser, self='never', isStatic=false, callStyles={positional:true, named:true}, doc}) {
        let docStr = doc?.length ? doc.join('\n')+'\n' : ''
        const parameterTypes = parameters.map(({name, modifier, type, doc}) => `${doc?'\n'+doc:''}${enquote(name)}${modifier}: ${type}`).join(', ')
        const parameterTypeAsObject = parameterTypes.length
            ? createObjectOf(parameterTypes)
            : empty
        const callableSignatures = []
        if (callStyles.positional) {
            const paramTypesPositional = parameters.map(({name, type, doc}) => `${doc?'\n'+doc:''}${enquote(name)}: ${type}`).join(', ') // must not include ? modifiers
            callableSignatures.push('// positional',`${docStr}(${paramTypesPositional}): ${returns}`) // docs shows up on action consumer side: `.action(...)`
        }
        if (callStyles.named) {
            const parameterNames = createObjectOf(parameters.map(({name}) => enquote(name)).join(', '))
            callableSignatures.push('// named',`${docStr}(${parameterNames}: ${parameterTypeAsObject}): ${returns}`)
        }
        if (callableSignatures.length === 0) throw new Error('At least one call style must be specified')
        let prefix = name ? `${enquote(name)}: `: ''
        if (prefix && isStatic) {
            prefix = `static ${prefix}`
        }
        const kindDef = kind ? [`kind: '${kind}'`] : []
        const suffix = initialiser ? ` = ${initialiser}` : ''

        return [
            `${prefix} {`,
            [...callableSignatures, '// metadata (do not use)', `__parameters: ${parameterTypeAsObject}, __returns: ${returns}, __self: ${self}`, ...kindDef],
            `}${suffix}`,
        ]
    }

    /**
     * Adds a pair of singular and plural inflection.
     * These are later used to generate the singular -> plural
     * aliases in the index.js file.
     * @param {object} options - options
     * @param {string} options.singular - singular type without namespace.
     * @param {string} options.plural - plural type without namespace
     * @param {string} options.original - original entity name without namespace.
     *        In many cases this will be the same as plural.
     * @param {boolean} [options.isNormalised] - whether the passed names are already normalised.
     */
    addInflection({singular, plural, original, isNormalised = false}) {
        this.inflections.push({singular, plural, original, isNormalised})
    }

    /**
     * Adds a function definition in form of a arrow function to the file.
     * @param {string} name - name of the function
     * @param {import('./typedefs').visitor.ParamInfo[]} parameters - list of parameters, passed as [name, modifier, type] tuple
     * @param {string} returns - the return type of the function
     * @param {'function' | 'action'} kind - kind of the node
     * @param {string[]} doc - documentation for the function
     * @param {{positional?: boolean, named?: boolean}} callStyles - how the operation can be called
     */
    addOperation(name, parameters, returns, kind, doc, callStyles) {
        // this.operations.buffer.add(`// ${kind}`)
        if (doc) this.operations.buffer.add(doc.join('\n')) // docs shows up on action provider side: `.on(action,...)`
        const [opener, content, closer] = SourceFile.stringifyLambda({name, parameters, returns, kind, doc, callStyles})
        this.operations.buffer.addIndentedBlock(`export declare const ${opener}`, content, closer)
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
            buffer.namespace = name
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
     * @param {string[]} doc - the enum docs
     */
    addEnum(fq, name, kvs, doc) {
        this.enums.data.push({ name, fq, kvs })
        printEnum(this.enums.buffer, name, kvs, {}, doc)
    }

    /**
     * Adds an inline enum to this file.
     * @param {string} entityCleanName - name of the entity the enum is attached to without namespace
     * @param {string} entityFqName - name of the entity the enum is attached to with namespace
     * @param {string} propertyName - property to which the enum is attached.
     * @param {[string, string][]} kvs - list of key-value pairs
     * @param {Buffer} [buffer] - if buffer is of subnamespace the enum will be added there,
     *                            otherwise to the inline enums of the file
     * @param {string[]} doc - the enum docs
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
    addInlineEnum(entityCleanName, entityFqName, propertyName, kvs, buffer, doc=[]) {
        const namespacedEntity = [buffer?.namespace, entityCleanName].filter(Boolean).join('.')
        this.enums.data.push({
            name: `${namespacedEntity}.${propertyName}`,
            property: propertyName,
            kvs,
            fq: `${namespacedEntity}.${propertyName}`
        })
        const entityProxy = this.entityProxies[namespacedEntity] ?? (this.entityProxies[namespacedEntity] = [])
        entityProxy.push(propertyName)

        // REVISIT: find a better way to do this???
        const printEnumToBuffer = (/** @type {Buffer} */buffer) => printEnum(buffer, propertyToInlineEnumName(entityCleanName, propertyName), kvs, {export: false}, doc)

        if (buffer?.namespace) {
            const tempBuffer = new Buffer()
            // we want to put the enums on class level
            tempBuffer.indent()
            printEnumToBuffer(tempBuffer)

            // we want to write the enums at the beginning of the namespace
            const [first,...rest] = buffer.parts
            buffer.parts = [first, ...tempBuffer.parts, ...rest]
        } else {
            printEnumToBuffer(this.inlineEnums.buffer)
        }
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
        const file = configuration.targetModuleType === 'esm'
            ? '/index.js'
            : ''
        for (const imp of Object.values(this.imports)) {
            if (!imp.isCwd(this.path.asDirectory())) {
                const from = imp.asDirectory({relative: this.path.asDirectory()}) + file
                buffer.add(`import * as ${imp.asIdentifier()} from '${from}';`)
            }
        }
        buffer.blankLine()
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
    #getEntityProxyFunctionExport() {
        return this.jsPrinter.printExport('createEntityProxy', proxyAccessFunction)
    }
    /**
     * Returns boilerplate code for `index.js` files
     * - `useEntitiesProxy = true` -> import `createEntityProxy` function for entity proxy
     * - `useEntitiesProxy = false` -> retrieve entities via `cds.entities(namespace)`
     * @returns {string[]}
     */
    #getJSExportBoilerplate() {
        const namespace = this.path.asNamespace()
        const jsp = this.jsPrinter
        const boilerplate = [AUTO_GEN_NOTE]
        if (configuration.useEntitiesProxy) {
            if (namespace === '_') {
                boilerplate.push(jsp.printDefaultImport('cds', '@sap/cds'), this.#getEntityProxyFunctionExport())
            } else {
                boilerplate.push(
                    jsp.printDeconstructedImport(
                        ['createEntityProxy'],
                        new Path(['_']).asDirectory({ relative: this.path.asDirectory() })
                    )
                )
            }
        } else {
            boilerplate.push(
                jsp.printImport('cds', '@sap/cds'),
                jsp.printConstant('csn', `cds.entities('${namespace}')`)
            )
        }
        return boilerplate
    }
    /**
     * Returns RHS for entity `module.exports` assignments
     * - `useEntitiesProxy = true` -> use function calls to create `Proxy` objects
     * - `useEntitiesProxy = false` -> access entity from CSN directly
     * @param {string} singular - singular name of entity
     * @param {string} original - original name of entity
     * @returns {{singularRhs: string, pluralRhs: string}}
     */
    #getEntityExportsRhs(singular, original) {
        if (configuration.useEntitiesProxy) {
            const namespace = this.path.asNamespace()
            // determine the custom properties for the proxy function call
            const customProps = this.entityProxies[singular] ?? []
            let customPropsStr = customProps.length ? `, customProps: ${JSON.stringify(customProps)}` : ''

            return {
                singularRhs: `createEntityProxy(['${namespace}', '${original}'], { target: { is_singular: true }${customPropsStr} })`,
                pluralRhs: `createEntityProxy(['${namespace}', '${original}'], { target: { is_singular: false }})`,
            }
        } else {
            // standard entity: csn.Books
            // inline entity: csn['Books.texts']
            const csnAccess = original.includes('.') ? `csn['${original}']` : `csn.${original}`
            return {
                singularRhs: `{ is_singular: true, __proto__: ${csnAccess} }`,
                pluralRhs: csnAccess
            }
        }
    }

    toJSExports() {
        const jsp = this.jsPrinter
        return this.#getJSExportBoilerplate() // boilerplate
            .concat(
                // FIXME: move stringification of service into own module
                this.services.names.flatMap(name => {
                    const nameSimple = /** @type {string} */(name.split('.').pop())
                    const service = [
                        jsp.printSingleLineComment('service'),
                        jsp.printConstant(nameSimple, `{ name: '${name}' }`),
                        jsp.printDefaultExport(nameSimple), // there should be only one and must be the first
                    ]
                    if (jsp instanceof CJSPrinter) {
                        // unfortunately, we have to add a tiny bit of special logic for CJS, where we get:
                        //
                        // module.exports = FooService
                        // module.exports.FooService = FooService
                        //
                        // which, in ESM, would amount to:
                        //
                        // export const FooService
                        // default export FooService = FooService // <- duplicate identifier
                        service.push(jsp.printExport(nameSimple, nameSimple))
                    }
                    return service
                })
            )
            .concat(this.inflections
            // sorting the entries based on the number of dots in their singular.
            // that makes sure we have defined all parent namespaces before adding subclasses to them e.g.:
            // "module.exports.Books" is defined before "module.exports.Books.text"
                .sort(({singular:a}, {singular:b}) => a.split('.').length - b.split('.').length)
                .flatMap(({singular, plural, original, isNormalised}) => {
                    const { singularRhs, pluralRhs } = this.#getEntityExportsRhs(singular, original)

                    const exports = [
                        jsp.printSingleLineComment(original),
                        jsp.printExport(singular, singularRhs)
                    ]
                    if (!/Array<.*>/.test(plural) && plural !== original) {
                        // FIXME: this is a hack to support CDS types that will produce "Array<MyType>" as plural, which we do not want as export in the index.js files
                        exports.push(jsp.printExport(plural, pluralRhs))
                    }
                    // FIXME: we currently produce at most 3 entries.
                    // This could be an issue when the user re-used the original name in a @singular/@plural annotation.
                    // Seems unlikely, but we have to eliminate the original entry if users start running into this.
                    if (singular !== original && !isNormalised) {
                        // do not do the is_singular spiel if the original name is used for the plural
                        // or if we had to normalise the name, which would imply an invalid identifier we can not use anyway
                        const rhs = plural === original ? pluralRhs : singularRhs
                        exports.push(jsp.printExport(original, rhs))
                    }
                    return exports
                })
            ) // singular -> plural aliases
            .concat(jsp.printSingleLineComment('events'))
            .concat(this.events.fqs.map(({fq, name}) => jsp.printExport(name, stringIdent(fq))))
            .concat(jsp.printSingleLineComment('actions'))
            .concat(this.operations.names.map(name => jsp.printExport(name, stringIdent(name))))
            .concat(jsp.printSingleLineComment('enums'))
            .concat(this.enums.data.map(({name, kvs}) => stringifyEnumImplementation(name, kvs, jsp)))
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
        /**
         * @type {boolean}
         */
        this.closed = false
        /**
         * Required for inline enums of inline compositions or text entities
         * @type {string | undefined}
         */
        this.namespace = undefined
    }

    /**
     * @returns {Buffer} an empty Buffer that starts at this Buffer's current indentation.
     */
    createSubBuffer() {
        const sub = new Buffer(this.indentation)
        sub.currentIndent = this.currentIndent
        return sub
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
     * @param {string | (() => string) | ((() => string) | string)[]} part  - what to attach to the buffer
     */
    add(part) {
        if (typeof part === 'string') {
            this.parts.push(this.currentIndent + part)
        } else if (Array.isArray(part)) {
            for (const p of part) {
                this.add(p)  // recurse to have proper indentation
            }
        } else if (typeof part === 'function') {
            this.parts.push(part())
        } else {
            throw new Error(`trying to add something of type ${typeof part} to a Buffer`)
        }
    }

    /**
     * Adds a blank line to the buffer.
     */
    blankLine() {
        this.add('')
    }

    /**
     * Adds an element to the buffer with one level of indent.
     * @param {string | string[] | (() => void)} part - either a string or a function. If it is a string, it is added to the buffer.
     * If not, it is expected to be a function that manipulates the buffer as a side effect.
     */
    addIndented(part) {
        this.indent()
        if (typeof part === 'function') {
            part()
        } else if (Array.isArray(part)) {
            part.forEach(p => { this.add(p) })
        } else if (typeof part === 'string') {
            this.add(part)
        }
        this.outdent()
    }

    /**
     * Adds an element to a buffer with one level of indent and opener and closer surrounding it.
     * @param {string} opener - the string to put before the indent
     * @param {string | string[] | (() => void)} content - the content to indent (see {@link addIndented})
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
    constructor(parts, kind = '') {
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
     * @param {string} [params.relative] - if defined, the path is constructed relative to this directory
     * @param {boolean} [params.local] - if set to true, './' is prefixed to the directory
     * @param {boolean} [params.posix] - if set to true, all slashes will be forward slashes on every OS. Useful for require/ import
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
     * @param {string} [relative] - directory to which we check relatively
     * @returns {boolean} true, iff the Path refers to the current working directory, aka './'
     */
    isCwd(relative = undefined) {
        return (!relative && this.parts.length === 0) || (!!relative && this.asDirectory({relative}) === './')
    }
}

// TODO: having the repository pattern in place we can separate (some of) the printing logic from the visitor.
// Most of it hinges primarily on resolving specific files. We can now pass the repository and the resolver to a printer.
class FileRepository {
    /** @type {{[key:string]: SourceFile}} */
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
            const outputFile = configuration.outputDTsFiles ? 'index.d.ts' : 'index.ts'
            try {
                await fs.mkdir(dir, { recursive: true })
                await Promise.all([
                    fs.writeFile(path.join(dir, outputFile), source.toTypeDefs()),
                    fs.writeFile(path.join(dir, 'index.js'), source.toJSExports()),
                ])

            } catch (/** @type {any} **/err) {
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
