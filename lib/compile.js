'use strict'

const cds = require('@sap/cds')
const { SourceFile, Path, writeout, baseDefinitions } = require('./file')
const util = require('./util')
const { Logger } = require('./logging')
const fs = require('fs')

/**
 * Builtin types defined by CDS.
 */
const Builtins = {
    UUID: 'string',
    String: 'string',
    Binary: 'string',
    LargeString: 'string',
    LargeBinary: 'string',
    Number: 'number',
    Integer: 'number',
    Integer16: 'number',
    Integer32: 'number',
    Integer64: 'number',
    Decimal: 'number',
    DecimalFloat: 'number',
    Float: 'number',
    Double: 'number',
    Boolean: 'boolean',
    Date: 'Date',
    DateTime: 'Date',
    Time: 'Date',
    Timestamp: 'Date',
    //
    Composition: 'Array',
}

class Visitor {
    constructor(cson, params = {}) {
        this.logger = params.logger || new Logger()
        this.cson = cson
        this.files = {}
        this.files[baseDefinitions.path.asIdentifier()] = baseDefinitions

        // Entities inherit their ancestors annotations:
        // https://cap.cloud.sap/docs/cds/cdl#annotation-propagation
        // This is a problem if we annotate @singular/ @plural to an entity A,
        // as we don't want all descendents B, C, ... to share the ancestor's
        // annotated inflexion
        // -> remove all such annotations that appear in a parent as well.
        // BUT: we can't just delete the attributes. Imagine three classes
        // A <- B <- C
        // where A contains a @singular annotation.
        // If we erase the annotation from B, C will still contain it and
        // can not detect that its own annotation was inherited without
        // travelling up the entire inheritance chain up to A.
        // So instead, we monkey patch and maintain a dictionary "erased"
        // when removing an annotation which we also check.
        const erase = (entity, parent, attr) => {
            if (attr in entity) {
                const ea = entity[attr]
                if (parent[attr] === ea || (parent.erased && parent.erased[attr] === ea)) {
                    if (!('erased' in entity)) {
                        entity.erased = {}
                    }
                    entity.erased[attr] = ea
                    delete entity[attr]
                    this.logger.info(`Removing inherited attribute ${attr} from ${entity.name}.`)
                }
            }
        }

        for (const [name, entity] of Object.entries(cson.definitions)) {
            let i = 0
            if (entity.includes) {
                while (
                    (entity[util.annotations.singular] || entity[util.annotations.plural]) &&
                    i < entity.includes.length
                ) {
                    const parent = this.cson.definitions[entity.includes[i]]
                    Object.values(util.annotations).forEach((an) => erase(entity, parent, an))
                    i++
                }
            }
        }

        this.visitDefinitions()
    }

    getNamespaceFile(path) {
        if (!(path in this.files)) {
            this.files[path] = new SourceFile(path)
        }
        return this.files[path]
    }

    visitDefinitions() {
        for (const [name, entity] of Object.entries(this.cson.definitions)) {
            this.visitEntity(name, entity)
        }
    }

    _createToOneAssociation(t) {
        return `${baseDefinitions.path.asIdentifier()}.Association.to<${t}>`
    }

    _createToManyAssociation(t) {
        return `${baseDefinitions.path.asIdentifier()}.Association.to.many<${t}>`
    }

    _createCompositionOfOne(t) {
        return `${baseDefinitions.path.asIdentifier()}.Composition.of<${t}>`
    }

    _createCompositionOfMany(t) {
        return `${baseDefinitions.path.asIdentifier()}.Composition.of.many<${t}>`
    }

    _docify(doc) {
        return ['/**'].concat(doc.split('\n').map((line) => `* ${line}`)).concat(['*/'])
    }

    _aspectify(name, entity, buffer, cleanName = undefined) {
        const clean = cleanName ?? this._trimNamespace(name)
        const ns = this._resolveNamespace(name.split('.'))
        const file = this.getNamespaceFile(ns)

        const identXtended = name => `${name}Xtended`
        const identAspect = name => `${name}Aspect`

        // CLASS ASPECT
        // while I would personally prefer arrow-function style, using function syntax spares us troubles
        // with definition order:
        //
        // # does not work
        // const A = () => class ...
        // const AXtended = B(A(Entity)) // error: B called before declaration
        // const B = () => class ...
        //
        // # works
        // function A () { return class ... }
        // const AXtended = B(A(Entity))
        // function B () { return class ... }

        buffer.add(`export function ${clean}<TBase extends new (...args: any[]) => {}>(Base: TBase) {`)
        buffer.indent()
        buffer.add(`return class ${identAspect(clean)} extends Base {`)
        buffer.indent()
        for (const [ename, element] of Object.entries(entity.elements) ?? []) {
            this.visitElement(ename, element, file, buffer)
        }
        buffer.outdent()
        buffer.add('};')
        buffer.outdent()
        buffer.add('}')

        // CLASS WITH ADDED ASPECTS
        file.addImport(baseDefinitions.path)
        const rhs = (entity.includes ?? [])
            .map((parent) => {
                const [ns, n] = this.untangle(parent)
                file.addImport(ns)
                return [ns, n]
            })
            .concat([[undefined, clean]]) // add own aspect without namespace AFTER imports were created
            .reverse() // reverse so that own aspect A is applied before extensions B,C: B(C(A(Entity)))
            .reduce(
                (wrapped, [ns, n]) =>
                    !ns || ns.isCwd(file.path.asDirectory()) ? `${n}(${wrapped})` : `${ns.asIdentifier()}.${n}(${wrapped})`,
                    `${baseDefinitions.path.asIdentifier()}.Entity`
            )

        buffer.add(`const ${identXtended(clean)} = ${rhs}`)
        buffer.add(`export type ${clean} = InstanceType<typeof ${identXtended(clean)}>`)
        buffer.add('')
    }

    _printEntity(name, entity) {
        const clean = this._trimNamespace(name)
        const ns = this._resolveNamespace(name.split('.'))
        const file = this.getNamespaceFile(ns)
        // entities are expected to be in plural anyway, so we would favour the regular name.
        // If the user decides to pass a @plural annotation, that gets precedence over the regular name.
        let plural = this._trimNamespace(entity[util.annotations.plural] ? util.plural4(entity, false) : name)
        const singular = util.singular4(entity, true)
        if (singular === plural) {
            plural += '_'
            this.logger.warning(
                `Derived singular and plural forms for '${singular}' are the same. This usually happens when your CDS entities are named following singular flexion. Consider naming your entities in plural or providing '@singular:'/ '@plural:' annotations to have a clear distinction between the two. Plural form will be renamed to '${plural}' to avoid compilation errors within the output.`
            )
        }
        if (singular in this.cson.definitions) {
            this.logger.error(
                `Derived singular '${singular}' for your entity '${name}', already exists. The resulting types will be erronous. Please consider using '@singular:'/ '@plural:' annotations in your model to resolve this collision.`
            )
        }
        file.addClass(singular, name)
        file.addClass(plural, name)

        const parent = this._resolveParent(entity.name)
        const buffer =
            parent && parent.kind === 'entity' ? file.getSubNamespace(this._trimNamespace(parent.name)) : file.classes

        // we can't just use "singular" here, as it may have the subnamespace removed:
        // "Books.text" is just "text" in "singular". Within the inflected exports we need
        // to have Books.texts = Books.text, so we derive the singular once more without cutting off the ns.
        // Directly deriving it from the plural makes sure we retain any parent namespaces of kind "entity",
        // which would not be possible while already in singular form, as "Book.text" could not be resolved in CSON.
        file.addInflection(util.singular4(plural), plural, clean)
        if ('doc' in entity) {
            this._docify(entity.doc).forEach((d) => buffer.add(d))
        }

        this._aspectify(name, entity, file.classes, singular)

        // PLURAL
        if (plural.includes('.')) {
            // Foo.text -> namespace Foo { class text { ... }}
            plural = plural.split('.').pop()
        }
        // plural can not be a type alias to $singular[] but needs to be a proper class instead,
        // so it can get passed as value to CQL functions.
        buffer.add(`export class ${plural} extends Array<${singular}> {`)
        buffer.add('}\n') // putting "}" in the next line as convenience for our test-parser

    }

    _printAction(name, action) {
        const ns = this._resolveNamespace(name.split('.'))
        const file = this.getNamespaceFile(ns)
        const params = action.params 
            ? Object.entries(action.params).map(([pname, ptype]) => [
                pname,
                this.resolveAndRequire(ptype, file),
            ])
            : []
        const returns = this.resolveAndRequire(action.returns, file)
        file.addAction(name.split('.').at(-1), params, returns)
    }

    _printType(name, type) {
        this.logger.debug(`Printing type ${name}:\n${JSON.stringify(type, null, 2)}`)
        const clean = this._trimNamespace(name)
        const ns = this._resolveNamespace(name.split('.'))
        const file = this.getNamespaceFile(ns)
        if ('enum' in type) {
            file.addEnum(
                name,
                clean,
                Object.entries(type.enum).map(([k, v]) => [k, v.val])
            )
        } else {
            // alias
            file.addType(name, clean, this.resolveAndRequire(type, file))
        }
        // TODO: annotations not handled yet
    }

    _printAspect(name, aspect) {
        this.logger.debug(`Printing aspect ${name}`)
        const clean = this._trimNamespace(name)
        const ns = this._resolveNamespace(name.split('.'))
        const file = this.getNamespaceFile(ns)
        // aspects are technically classes and can therefore be added to the list of defined classes.
        // Still, when using them as mixins for a class, they need to already be defined.
        // So we separate them into another buffer which is printed before the classes.
        file.addClass(clean, name)
        file.aspects.add(`// the following represents the CDS aspect '${clean}'`)
        this._aspectify(name, aspect, file.aspects, clean)
    }

    visitEntity(name, entity) {
        switch (entity.kind) {
            case 'entity':
                this._printEntity(name, entity)
                break
            case 'action':
                this._printAction(name, entity)
                break
            case 'type':
                this._printType(name, entity)
                break
            case 'aspect':
                this._printAspect(name, entity)
                break
            default:
                this.logger.error(`Unhandled entity kind '${entity.kind}'.`)
        }
    }

    getMaxCardinality(element) {
        const cardinality = element && element.cardinality && element.cardinality.max ? element.cardinality.max : 1
        return cardinality === '*' ? Infinity : parseInt(cardinality)
    }

    untangle(fq) {
        const ns = this._resolveNamespace(fq.split('.'))
        const name = this._trimNamespace(fq)
        return [new Path(ns.split('.')), name]
    }

    resolveAndRequire(element, file) {
        const t = this.resolveType(element, file)
        const cardinality = this.getMaxCardinality(element)
        let typeName = t.plainName || t.type

        // TODO: this could go into resolve type
        if (t.isBuiltin === false) {
            // resolve and maybe generate an import.
            // Inline declarations don't have a corresponding path, etc., so skip those.
            if (t.isInlineDeclaration === false) {
                const namespace = this._resolveNamespace(t.path.parts)
                const parent = new Path(namespace.split('.')) //t.path.getParent()
                // TODO: make sure the resolution still works. Currently, we only cut off the namespace!
                let singular = util.singular4(t.cson) //.slice(namespace.length + 1)
                let plural = t.cson[util.annotations.plural]
                    ? util.plural4(t.cson) //.slice(namespace.length + 1)
                    : typeName //this._trimNamespace(typeName)

                if (namespace) {
                    // TODO: not totally sure why plural doesn't have to be sliced
                    singular = singular.slice(namespace.length + 1)
                }

                if (!singular || !plural) {
                    this.logger.error(
                        `Either singular ('${singular}') or plural ('${plural}') for '${typeName}' is empty.`
                    )
                }

                if (singular === plural) {
                    // same as when creating the entity
                    plural += '_'
                }

                if (!parent.isCwd(file.path.asDirectory())) {
                    file.addImport(parent)
                    // prepend namespace
                    typeName = `${parent.asIdentifier()}.${typeName}`
                    singular = `${parent.asIdentifier()}.${singular}`
                    plural = `${parent.asIdentifier()}.${plural}`
                }

                switch (element.constructor.name) {
                    case 'Association':
                        typeName =
                            cardinality > 1
                                ? this._createToManyAssociation(plural)
                                : this._createToOneAssociation(singular)
                        file.addImport(baseDefinitions.path)
                        break
                    case 'Composition':
                        typeName =
                            cardinality > 1
                                ? this._createCompositionOfMany(plural)
                                : this._createCompositionOfOne(singular)
                        file.addImport(baseDefinitions.path)
                        break
                }
            }

            for (const imp of t.imports ?? []) {
                if (!imp.isCwd(file.path.asDirectory())) {
                    file.addImport(imp)
                }
            }
        }

        return typeName
    }

    visitElement(name, element, file, buffer) {
        buffer = buffer || file.classes
        if ('doc' in element) {
            for (const d of this._docify(element.doc)) {
                buffer.add(d)
            }
        }
        buffer.add(`${name}: ${this.resolveAndRequire(element, file)};`)
    }

    _resolveParent(name) {
        return this.cson.definitions[name.split('.').slice(0, -1).join('.')]
    }

    _resolveNamespace(pathParts) {
        let result
        while (result === undefined) {
            const path = pathParts.join('.')
            const def = this.cson.definitions[path]
            if (!def) {
                result = path
            } else if (['context', 'service'].includes(def.kind)) {
                result = path
            } else {
                pathParts = pathParts.slice(0, -1)
            }
        }
        return result
    }

    resolveType(element, file) {
        const result = {
            isBuiltin: false, // will be rectified in the corresponding handlers, if needed
            isInlineDeclaration: false,
            isForeignKeyReference: false,
        }

        if (element?.type === undefined) {
            result.type = '{}' // FIXME: really?
            result.isInlineDeclaration = true
        } else if (element.type === 'cds.Composition') {
            // FIXME: element.cardinality
            this._resolvePotentialReferenceType(element.target, result, file)
        } else if (element.type === 'cds.Association') {
            this._resolvePotentialReferenceType(element.target, result, file)
        } else if (element.items) {
            this._resolveInlineDeclarationType(element.items, result, file)
        } else if (element.elements) {
            this._resolveInlineDeclarationType(element.elements, result, file)
        } else {
            this._resolvePotentialReferenceType(element.type, result, file)
        }

        if (result.isBuiltin === false && !result.plainName) {
            this.logger.warning(`Plain name is empty for ${element?.type ?? '<empty>'}. This will probably cause issues.`)
        }
        return result
    }

    _resolveInlineDeclarationType(val, into, relativeTo) {
        // we can encounter inline declarations of types, e.g.
        // record   : array of {
        //   column : String;
        //   data   : String;
        // }
        // which have to be consumed recursively. For them, we create a dummy
        // file to collect both the source and all required imports.
        // We declare this dummy file to be at the same position as the
        // file we are actually resolving the type for (relativeTo).
        // By doing that, we will correctly determine when we are dealing with
        // an import from relativeTo and drop the preceeding namespace during usage.
        const dummy = new SourceFile(relativeTo.path.asDirectory())
        dummy.classes.currentIndet = relativeTo.classes.currentIndent
        dummy.classes.add('{')
        dummy.classes.indent()
        dummy.classes.indent()
        for (const [subname, subelement] of val.elements ? Object.entries(val.elements) : []) {
            this.visitElement(subname, subelement, dummy)
        }
        dummy.classes.outdent()
        dummy.classes.add('}')
        // FIXME: pass as param
        //dummy.classes.add(element.constructor.name === 'array' ? '}[]' : '}')
        into.type = dummy.classes.join('\n')
        into.imports = into.imports ?? []
        into.imports.push(...Object.values(dummy.imports))
        into.isInlineDeclaration = true
    }

    _resolvePotentialReferenceType(val, into, file) {
        // FIXME: get rid of file parameter! it is only used to pass to _resolveInlineDeclarationType
        if (val.elements) {
            this._resolveInlineDeclarationType(val, into, file) // FIXME INDENT!
        } else if (val.constructor === Object && 'ref' in val) {
            this._resolveTypeName(val.ref[0], into)
            into.isForeignKeyReference = true
        } else {
            // val is string
            this._resolveTypeName(val, into)
        }
    }

    _trimNamespace(p) {
        // start on right side, go up while we have an entity at hand
        // we cant start on left side, as that clashes with undefined entities like "sap"
        const parts = p.split('.')
        if (parts.length <= 1) {
            return p
        }

        let qualifier = parts.join('.')
        while (
            this.cson.definitions[qualifier] &&
            ['entity', 'type', 'aspect'].includes(this.cson.definitions[qualifier].kind)
        ) {
            parts.pop()
            qualifier = parts.join('.')
        }

        return qualifier ? p.substring(qualifier.length + 1) : p
    }

    _resolveTypeName(t, into) {
        const result = into || {}
        const path = t.split('.')
        if (path.length === 2 && path[0] === 'cds') {
            // builtin type
            const resolvedBuiltin = Builtins[path[1]]
            if (!resolvedBuiltin) {
                throw new Error(`Can not resolve apparent builtin type '${t}' to any CDS type.`)
            }
            result.type = resolvedBuiltin
            result.isBuiltin = true
        } else if (t in this.cson.definitions) {
            // user-defined type
            result.type = this._trimNamespace(util.singular4(this.cson.definitions[t])) //(path[path.length - 1])
            result.isBuiltin = false
            result.path = new Path(path) // FIXME: relative to current file
            result.cson = this.cson.definitions[t]
            result.plainName = this._trimNamespace(t)
        } else {
            throw new Error(`Can not resolve '${t}' to either a builtin or any user defined type.`)
        }

        return result
    }
}

const writeJsConfig = (path, logger) => {
    let values = {
        compilerOptions: {
            checkJs: true,
        },
    }

    if (fs.existsSync(path)) {
        const currentContents = JSON.parse(fs.readFileSync(path))
        if (currentContents?.compilerOptions?.checkJs) {
            logger.warning(`jsconfig at location ${path} already exists. Attempting to merge.`)
        }
        util.deepMerge(currentContents, values)
        values = currentContents
    }

    fs.writeFileSync(path, JSON.stringify(values, null, 2))
}


const compileFromFile = async (inputFile, params) => {
    const cson = await cds.linked(await cds.load(inputFile, { docs: true, flavor: 'xtended' }))
    return compileFromCSON(cson, params)
}

const compileFromCSON = async (cson, params) => {
    
    const logger = new Logger()
    logger.addFrom(params.logLevel)
    if (params.jsConfigPath) {
        writeJsConfig(params.jsConfigPath, logger)
    }
    return writeout(
        params.rootDirectory,
        Object.values(
            new Visitor(cson, {
                logger,
            }).files
        )
    )    
}

module.exports = {
    Visitor,
    compileFromFile,
    compileFromCSON,
}
