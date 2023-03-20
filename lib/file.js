'use strict'

const fs = require('fs').promises
const path = require('path')

const AUTO_GEN_NOTE = "// This is an automatically generated file. Please do not change its contents manually!"

class Buffer {
    constructor(indentation = '  ') {
        this.parts = []
        this.indentation = indentation
        this.currentIndent = ''
    }

    indent() {
        this.currentIndent += this.indentation
    }

    outdent() {
        if (this.currentIndent.length === 0) {
            throw new Error('Can not outdent buffer further. Probably mismatched indent.')
        }
        this.currentIndent = this.currentIndent.slice(0, -this.indentation.length)
    }

    join(glue = '\n') {
        return this.parts.join(glue)
    }

    clear() {
        this.parts = []
    }

    add(part) {
        this.parts.push(this.currentIndent + part)
    }
}

class Path {
    constructor(parts, kind) {
        this.parts = parts
        this.kind = kind
    }

    getParent() {
        return new Path(this.parts.slice(0, -1))
    }

    asDirectory(relative = undefined, local = true) {
        const prefix = local ? `.${path.sep}` : ''
        const absolute = path.join(...this.parts)
        const p = relative ? path.relative(relative, absolute) : absolute
        // path.join removes leading ./, so we have to concat manually here
        return prefix + p
    }

    asNamespace() {
        return this.parts.join('.')
    }

    asIdentifier() {
        return `_${this.parts.join('_')}`
    }

    isCwd(relative = undefined) {
        return (!relative && this.parts.length === 0) || (!!relative && this.asDirectory(relative) === './')
    }
}

class SourceFile {
    constructor(path) {
        this.path = new Path(path.split('.'))
        this.imports = {}
        this.preamble = new Buffer()
        this.types = new Buffer()
        this.enums = new Buffer()
        this.classes = new Buffer()
        this.actions = new Buffer()
        this.aspects = new Buffer()
        this.namespaces = {}
        // for .js file
        this.classNames = {}
        this.typeNames = {}
        this.inflections = []
    }

    addInflection(singular, plural, original) {
        this.inflections.push([singular, plural, original])
    }

    addAction(name, params, returns) {
        const ps = params.map(([n, t]) => `${n}: ${t}`).join(', ')
        this.actions.add("// action")
        this.actions.add(`export declare const ${name}: ( args: { ${ps} }) => ${returns};`)
    }

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

    addEnum(name, clean, kvs) {
        this.enums.add(`export enum ${clean} {`)
        this.enums.indent()
        for (const [k, v] of kvs) {
            this.enums.add(`${k} = ${v},`)
        }
        this.enums.outdent()
        this.enums.add('}')
    }

    addClass(clean, fq) {
        this.classNames[clean] = fq
    }

    addImport(imp) {
        const dir = imp.asDirectory(this.path.asDirectory())
        if (!(dir in this.imports)) {
            this.imports[dir] = imp
        }
    }

    addPreamble(code) {
        this.preamble.add(code)
    }

    addType(fq, clean, rhs) {
        this.typeNames[clean] = fq
        this.types.add(`export type ${clean} = ${rhs};`)
    }

    getImports() {
        const buffer = new Buffer()
        for (const imp of Object.values(this.imports)) {
            if (!imp.isCwd(this.path.asDirectory())) {
                buffer.add(`import * as ${imp.asIdentifier()} from '${imp.asDirectory(this.path.asDirectory())}';`)
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
            this.types.join(),
            this.enums.join(),
            namespaces.join(),
            this.aspects.join(), // needs to be before classes
            this.classes.join(),
            this.actions.join(),
        ].join('\n')
    }

    toJSExports() {
        return [AUTO_GEN_NOTE, "const cds = require('@sap/cds')", `const csn = cds.entities('${this.path.asNamespace()}')`] // boilerplate
            .concat(
                this.inflections
                    // sorting the entries based on the number of dots in their singular.
                    // that makes sure we have defined all parent namespaces before adding subclasses to them e.g.:
                    // "module.exports.Books" is defined before "module.exports.Books.text"
                    .sort(([a], [b]) => a.split('.').length - b.split('.').length)
                    // by using a temporary Set we make sure to catch cases where
                    // (1) plural is the same as original (default case) and
                    // (2) plural differs from original, i.e. when a @plural annotation is present
                    //     or when plural4 produced weird inflection.
                    .flatMap(([singular, plural, original]) => Array.from(new Set([
                        `module.exports.${singular} = csn.${original}`,
                        `module.exports.${plural} = csn.${original}`,
                        `module.exports.${original} = csn.${original}`
                    ])))
            ) // singular -> plural aliases
            .join('\n')
    }
}

const baseDefinitions = new SourceFile('_')
baseDefinitions.addPreamble(`
export namespace Association {
    export type to <T> = T & ((fn:(a:T)=>any) => T)
    export namespace to {
        // type many <T> = T[] & (T extends (infer R)[] ? R[] & ((fn:(a:R)=>any) => R[]) : T[]);
        export type many <T extends readonly unknown[]> = T & ((fn:(a:T[number])=>any) => T[number]);
    }
}

export namespace Composition {
    export type of <T> = T & ((fn:(a:T)=>any) => T)
    export namespace of {
        //type many <T> = T[] & (T extends (infer R)[] ? R[] & ((fn:(a:R)=>any) => R[]) : T[]);
        export type many <T extends readonly unknown[]> = T & ((fn:(a:T[number])=>any) => T[number]);
    }
}

export class Entity {
    static data<T extends Entity> (this:T, input:Object) : T {
        return {} as T // mock
    }
}

export type EntitySet<T> = T[] & {
    data (input:object[]) : T[]
    data (input:object) : T
}
`)

const writeout = async (root, sources) =>
    Promise.all(
        sources.map(async (source) => {
            const dir = path.join(root, source.path.asDirectory(undefined, false))
            try {
                await fs.mkdir(dir, { recursive: true })
                await Promise.all([
                        fs.writeFile(path.join(dir, 'index.ts'), source.toTypeDefs()),
                        fs.writeFile(path.join(dir, 'index.js'), source.toJSExports()),
                    ])

            } catch (err) {
                // eslint-disable-next-line no-console
                console.error(`Could not create parent directory ${dir}: ${err}.`)
            }
            return dir
        })
    )

module.exports = {
    Buffer,
    SourceFile,
    Path,
    writeout,
    baseDefinitions,
}
