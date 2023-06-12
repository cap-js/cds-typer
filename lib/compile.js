'use strict'

const fs = require('fs')
const { normalize } = require('path')
const cds = require('@sap/cds')
const util = require('./util')

const { SourceFile, Path, Library, writeout, baseDefinitions, Buffer } = require('./file')
const { FlatInlineDeclarationResolver, StructuredInlineDeclarationResolver } = require('./components/inline')
const { Logger } = require('./logging')



 /** @typedef {import('./file').Buffer} Buffer */
 /** @typedef {import('./file').File} File */
 
 /** 
 * @typedef {{
 *    cardinality?: { max?: '*' | number }
 * }} EntityCSN 
 */

 /** 
 * @typedef {{
 *    definitions?: Object<string, EntityCSN>
 * }} CSN
 */

 /** 
 * @typedef { {
 *    rootDirectory: string, 
 *    logLevel: number, 
 *    jsConfigPath?: string
 * }} CompileParameters
 */

 /** 
 * `propertiesOptional = true` -> all properties are generated as optional ?:. (standard CAP behaviour, where properties be unavailable)
 * `inlineDeclarations = 'structured'` -> @see inline.StructuredInlineDeclarationResolver
 * `inlineDeclarations = 'flat'` -> @see inline.FlatInlineDeclarationResolver
 * @typedef { { 
  *    propertiesOptional: boolean,
  *    inlineDeclarations: 'flat' | 'structured',
 * }} VisitorOptions 
 */

 /**
  * @typedef {{
  *   typeName: string,
  *   singular: string,
  *   plural: string
  * }} Inflection
  */

 /**
 * When nested inline types require additional imports. E.g.:
 * ```cds
 * // mymodel.cds
 * Foo {
 *   bar: {
 *     baz: a.b.c.Baz // need to require a.b.c in mymodel.cds!
 *   }
 * }
 * ```
 * @typedef {{
 *    isBuiltin: boolean,
 *    isInlineDeclaration: boolean,
 *    isForeignKeyReference: boolean,
 *    type: string, 
 *    path?: Path,
 *    csn?: CSN,
 *    imports: Path[] 
 *    inner: TypeResolveInfo
 * }} TypeResolveInfo
*/

/**
 * @typedef {{
 *   entity: String
 * }} Context
 */

/**
 * Builtin types defined by CDS.
 */
const Builtins = {
    UUID: 'string',
    String: 'string',
    Binary: 'string',
    LargeString: 'string',
    LargeBinary: 'string',
    Integer: 'number',
    UInt8: 'number',
    Int16: 'number',
    Int32: 'number',
    Int64: 'number',
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
    Association: 'Array'
}

const defaults = {
    // FIXME: add defaults for remaining parameters
    propertiesOptional: true,
    inlineDeclarations: 'flat'
}


class Visitor {
    /**
     * Generates singular and plural inflection for the passed type.
     * Several cases are covered here:
     * - explicit annotation by the user in the CSN
     * - implicitly derived inflection based on simple grammar rules
     * - collisions between singular and plural name (resolved by appending a '_' suffix)
     * - inline type definitions, which don't really have a linguistic plural, 
     *   but need to expressed as array type to be consumable by the likes of Composition.of.many<T>
     * @param {TypeResolveInfo} typeInfo information about the type gathered so far.
     * @param {string} [namespace] namespace the type occurs in. If passed, will be shaved off from the name
     * @returns {Inflection}
     */
    inflect (typeInfo, namespace) {
        let typeName
        let singular
        let plural

        if (typeInfo.isInlineDeclaration) {
            // if we detected an inline declaration, we take a quick detour via an InlineDeclarationResolver
            // to rectify the typeName (which would be just '{' elsewise).
            // The correct typename in string form is required in stringifyLambda(...)
            // Note that whenever the typeName is relevant, it is assumed to be in structured form
            // (i.e. a struct), so we always use a StructuredInlineDeclarationResolver here, regardless of 
            // what is configured for nested declarations in the visitor.
            // FIXME: in most other places where we have an inline declaration, we actually don't need the typeName.
            // If stringifyLambda(...) is the only place where we need this, we should have stringifyLambda call this 
            // piece of code instead to reduce overhead.
            const into = new Buffer()
            new StructuredInlineDeclarationResolver(this).printInlineType(undefined, {typeInfo}, into, '')
            typeName = into.join(' ')
            singular = typeName
            plural = `Array<${typeName}>`
        } else {
            // TODO: make sure the resolution still works. Currently, we only cut off the namespace!
            singular = util.singular4(typeInfo.csn)
            plural = util.getPluralAnnotation(typeInfo.csn)
                ? util.plural4(typeInfo.csn)
                : typeInfo.plainName

            // don't slice off namespace if it isn't part of the inflected name.
            // This happens when the user adds an annotation and singular4 therefore
            // already returns an identifier without namespace
            if (namespace && singular.startsWith(namespace)) {
                // TODO: not totally sure why plural doesn't have to be sliced
                singular = singular.slice(namespace.length + 1)
            }

            if (singular === plural) {
                // same as when creating the entity
                plural += '_'
            }  
        }
        if (!singular || !plural) {
            this.logger.error(`Singular ('${singular}') or plural ('${plural}') for '${typeName}' is empty.`)
        }

        return { typeName, singular, plural }
    }

    /**
     * Gathers all files that are supposed to be written to
     * the type directory. Including generated source files,
     * as well as library files.
     * @returns {File[]} a full list of files to be written
     */
    getWriteoutFiles() {
        return Object.values(this.files).concat(this.libraries.filter(lib => lib.referenced))
    }

    /**
     * @param csn root CSN
     * @param {VisitorOptions} options
     */
    constructor(csn, options = {}, logger = new Logger()) {
        this.options = { ...defaults, ...options }
        this.logger = logger
        this.csn = csn

        /** @type {Context[]} **/
        this.contexts = []

        /** @type {Library[]} */
        this.libraries = [new Library(require.resolve('../library/cds.hana.ts'))]
        
        /** @type {Object<string, File>} */
        this.files = {}
        this.files[baseDefinitions.path.asIdentifier()] = baseDefinitions
        this.inlineDeclarationResolver = this.options.inlineDeclarations === 'structured'
            ? new StructuredInlineDeclarationResolver(this)
            : new FlatInlineDeclarationResolver(this)

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

        for (const entity of Object.values(csn.definitions)) {
            let i = 0
            if (entity.includes) {
                while (
                    (util.getSingularAnnotation(entity) || util.getPluralAnnotation(entity)) &&
                    i < entity.includes.length
                ) {
                    const parent = this.csn.definitions[entity.includes[i]]
                    Object.values(util.annotations).flat().forEach(an => erase(entity, parent, an))
                    i++
                }
            }
        }

        this.visitDefinitions()
    }

    /**
     * Determines the file corresponding to the namespace.
     * If no such file exists yet, it is created first.
     * @param {string} path the name of the namespace (foo.bar.baz)
     * @returns {SourceFile} the file corresponding to that namespace name
     */
    getNamespaceFile(path) {
        if (!(path in this.files)) {
            this.files[path] = new SourceFile(path)
        }
        return this.files[path]
    }

    /**
     * Visits all definitions within the CSN definitions.
     */
    visitDefinitions() {
        for (const [name, entity] of Object.entries(this.csn.definitions)) {
            this.visitEntity(name, entity)
        }
    }

    /**
     * Wraps type into association to scalar.
     * @param {string} t the singular type name. 
     * @returns {string}
     */
    _createToOneAssociation(t) {
        return `${baseDefinitions.path.asIdentifier()}.Association.to<${t}>`
    }

    /**
     * Wraps type into association to vector.
     * @param {string} t the singular type name. 
     * @returns {string}
     */
    _createToManyAssociation(t) {
        return `${baseDefinitions.path.asIdentifier()}.Association.to.many<${t}>`
    }

    /**
     * Wraps type into composition of scalar.
     * @param {string} t the singular type name. 
     * @returns {string}
     */
    _createCompositionOfOne(t) {
        return `${baseDefinitions.path.asIdentifier()}.Composition.of<${t}>`
    }

    /**
     * Wraps type into composition of vector.
     * @param {string} t the singular type name. 
     * @returns {string}
     */
    _createCompositionOfMany(t) {
        return `${baseDefinitions.path.asIdentifier()}.Composition.of.many<${t}>`
    }

    /**
     * Puts a passed string in docstring format.
     * @param {string} doc raw string to docify. May contain linebreaks.
     * @returns {string[]} an array of lines wrapped in doc format. The result is not
     *          concatenated to be properly indented by `buffer.add(...)`.
     */
    _docify(doc) {
        return doc ? ['/**'].concat(doc.split('\n').map((line) => `* ${line}`)).concat(['*/']) : []
    }

    /**
     * Transforms an entity or CDS aspect into a JS aspect (aka mixin).
     * That is, for an element A we get:
     * - the function A(B) to mix the aspect into another class B
     * - the const AXtended which represents the entity A with all of its aspects mixed in (this const is not exported)
     * - the type A to use for external typing and is derived from AXtended.
     * @param {string} name the name of the entity
     * @param {CSN} element the pointer into the CSN to extract the elements from
     * @param {Buffer} buffer the buffer to write the resulting definitions into
     * @param {string?} cleanName the clean name to use. If not passed, it is derived from the passed name instead.
     */
    _aspectify(name, entity, buffer, cleanName = undefined) {
        const clean = cleanName ?? this._trimNamespace(name)
        const ns = this._resolveNamespace(name.split('.'))
        const file = this.getNamespaceFile(ns)

        const identSingular = name => name
        const identAspect = name => `_${name}Aspect`

        this.contexts.push({
            entity: name
        })

        // CLASS ASPECT
        // while I would personally prefer arrow-function style, using function syntax spares us troubles
        // with hoisting:
        //
        // # does not work
        // const A_fn = () => class ...
        // const A = B_fn(A_fn(Entity)) // error: B called before declaration
        // const B_fn = () => class ...
        //
        // # works
        // function A_fn () { return class ... }
        // const A = B_fn(A_fn(Entity))
        // function B_fn () { return class ... }

        buffer.add(`export function ${identAspect(clean)}<TBase extends new (...args: any[]) => any>(Base: TBase) {`)
        buffer.indent()
        buffer.add(`return class ${clean} extends Base {`)
        buffer.indent()
        for (const [ename, element] of Object.entries(entity.elements ?? {})) {
            this.visitElement(ename, element, file, buffer)
        }
        for (const [aname, action] of Object.entries(entity.actions ?? {})) {
            buffer.add(SourceFile.stringifyLambda(
                aname, 
                Object.entries(action.params ?? {}).map(([n,t]) => [n, this.resolveAndRequire(t, file).typeName]),
                action.returns ? this.resolveAndRequire(action.returns, file).typeName : 'any'
            ))
            //this.visitEntity(aname, action, file, buffer)
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
                    !ns || ns.isCwd(file.path.asDirectory()) ? `${identAspect(n)}(${wrapped})` : `${ns.asIdentifier()}.${identAspect(n)}(${wrapped})`,
                    `${baseDefinitions.path.asIdentifier()}.Entity`
            )

        buffer.add(`export class ${identSingular(clean)} extends ${rhs} {}`)
        //buffer.add(`export type ${clean} = InstanceType<typeof ${identSingular(clean)}>`)
        this.contexts.pop()
    }

    _printEntity(name, entity) {
        const clean = this._trimNamespace(name)
        const ns = this._resolveNamespace(name.split('.'))
        const file = this.getNamespaceFile(ns)
        // entities are expected to be in plural anyway, so we would favour the regular name.
        // If the user decides to pass a @plural annotation, that gets precedence over the regular name.
        let plural = util.unlocalize(this._trimNamespace(util.getPluralAnnotation(entity) ? util.plural4(entity, false) : name))
        const singular = util.unlocalize(util.singular4(entity, true))
        if (singular === plural) {
            plural += '_'
            this.logger.warning(
                `Derived singular and plural forms for '${singular}' are the same. This usually happens when your CDS entities are named following singular flexion. Consider naming your entities in plural or providing '@singular:'/ '@plural:' annotations to have a clear distinction between the two. Plural form will be renamed to '${plural}' to avoid compilation errors within the output.`
            )
        }
        if (singular in this.csn.definitions) {
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
        // which would not be possible while already in singular form, as "Book.text" could not be resolved in CSN.
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
        buffer.add(`export class ${plural} extends Array<${singular}> {}`)
        buffer.add('')
    }

    _printAction(name, action) {
        this.logger.debug(`Printing action ${name}:\n${JSON.stringify(action, null, 2)}`)
        const ns = this._resolveNamespace(name.split('.'))
        const file = this.getNamespaceFile(ns)
        const params = action.params
            ? Object.entries(action.params).map(([pname, ptype]) => [
                pname,
                this.resolveAndRequire(ptype, file).typeName,
            ])
            : []
        const returns = this.resolveAndRequire(action.returns, file).typeName
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
            file.addType(name, clean, this.resolveAndRequire(type, file).typeName)
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

    /**
     * Visits a single entity from the CSN's definition field.
     * Will call _printEntity or _printAction based on the entity's kind.
     * @param {string} name name of the entity, fully qualified as is used in the definition field.
     * @param {CSN} entity CSN data belonging to the entity to perform lookups in.
     */
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

    /**
     * Attempts to retrieve the max cardinality of a CSN for an entity.
     * @param {EntityCSN} element csn of entity to retrieve cardinality for
     * @returns {number} max cardinality of the element. 
     * If no cardinality is attached to the element, cardinality is 1.
     * If it is set to '*', result is Infinity.
     */
    getMaxCardinality(element) {
        const cardinality = element && element.cardinality && element.cardinality.max ? element.cardinality.max : 1
        return cardinality === '*' ? Infinity : parseInt(cardinality)
    }

    /**
     * Conveniently combines _resolveNamespace and _trimNamespace
     * to end up with both the resolved Path of the namespace,
     * and the clean name of the class.
     * @param {string} fq the fully qualified name of an entity.
     * @returns {[Path, string]} a tuple, [0] holding the path to the namespace, [1] holding the clean name of the entity.
     */ 
    untangle(fq) {
        const ns = this._resolveNamespace(fq.split('.'))
        const name = this._trimNamespace(fq)
        return [new Path(ns.split('.')), name]
    }

    /**
     * A self reference is a property that references the class it appears in.
     * They need to be detected on CDS level, as the emitted TS types will try to
     * refer to refer to types via their alias that hides the aspectification.
     * If we attempt to directly refer to this alias while it has not been fully created,
     * that will result in a TS error.
     * @param {String} entityName
     * @returns {boolean} true, if `entityName` refers to the surrounding class
     * @example 
     * ```ts
     * class TreeNode {
     *   value: number
     *   parent: TreeNode // <- self reference
     * }
     * ```
     */
    isSelfReference(entityName) {
        return entityName === this.contexts.at(-1)?.entity
    }

    /**
     * Convenient API to consume resolveType.
     * Internally calls resolveType, determines how it has to be imported,
     * used, etc. relative to file and just returns the name under
     * which it will finally be known within file.
     * 
     * For example: 
     * model1.cds contains entity Foo
     * model2.cds references Foo
     * 
     * calling resolveAndRequire({... Foo}, model2.d.ts) would then:
     * 1. add an import of model1 to model2 with proper path resolution and alias, e.g. "import * as m1 from './model1'"
     * 2. resolve any singular/ plural issues and association/ composition around it
     * 3. return a properly prefixed name to use within model2.d.ts, e.g. "m1.Foo"
     * 
     * @param {CSN} element the CSN element to resolve the type for.
     * @param {SourceFile} file source file for context.
     * @returns {{typeName: string, typeInfo: TypeResolveInfo & { inflection: Inflection } }} info about the resolved type
     */
    resolveAndRequire(element, file) {
        const typeInfo = this.resolveType(element, file)
        const cardinality = this.getMaxCardinality(element)

        let typeName = typeInfo.plainName ?? typeInfo.type

        if (typeInfo.isBuiltin === true) {
            const [toOne, toMany] = {
                'Association': [this._createToOneAssociation, this._createToManyAssociation],
                'Composition': [this._createCompositionOfOne, this._createCompositionOfMany]
            }[element.constructor.name] ?? []

            if (toOne && toMany) {
                const target = typeof element.target === 'string' ? { type: element.target } : element.target
                const { singular, plural } = this.resolveAndRequire(target, file).typeInfo.inflection    
                typeName = cardinality > 1
                        ? toMany.bind(this)(plural)
                        : toOne.bind(this)(this.isSelfReference(element.target) ? 'this' : singular)
                file.addImport(baseDefinitions.path)               
            }
        } else {
            // TODO: this could go into resolve type
            // resolve and maybe generate an import.
            // Inline declarations don't have a corresponding path, etc., so skip those.
            if (typeInfo.isInlineDeclaration === false) {
                const namespace = this._resolveNamespace(typeInfo.path.parts)
                const parent = new Path(namespace.split('.')) //t.path.getParent()
                typeInfo.inflection = this.inflect(typeInfo, namespace)

                if (!parent.isCwd(file.path.asDirectory())) {
                    file.addImport(parent)
                    // prepend namespace
                    typeName = `${parent.asIdentifier()}.${typeName}`
                    typeInfo.inflection.singular = `${parent.asIdentifier()}.${typeInfo.inflection.singular}`
                    typeInfo.inflection.plural = `${parent.asIdentifier()}.${typeInfo.inflection.plural}`
                }

                if (element.type.ref?.length > 1) {
                    const [entity, ...members] = element.type.ref
                    const lookup = this.inlineDeclarationResolver.getTypeLookup(members)
                    typeName = `__.DeepRequired<${typeInfo.inflection.singular}>${lookup}`
                    file.addImport(baseDefinitions.path)
                }
            }
            // FIXME NOW: inline declarations, aka structs go here!

            for (const imp of typeInfo.imports ?? []) {
                if (!imp.isCwd(file.path.asDirectory())) {
                    file.addImport(imp)
                }
            }
        }

        if (typeInfo.isInlineDeclaration === true) {
            typeInfo.inflection = this.inflect(typeInfo)
        }

        return {typeName, typeInfo}
    }

    /**
     * Visits a single element in an entity.
     * @param {string} name name of the element
     * @param {CSN} element CSN data belonging to the the element.
     * @param {SourceFile} file the namespace file the surrounding entity is being printed into.
     * @param {Buffer} buffer buffer to add the definition to. If no buffer is passed, the passed file's class buffer is used instead.
     * @returns @see InlineDeclarationResolver.visitElement
     */
    visitElement(name, element, file, buffer) {
        return this.inlineDeclarationResolver.visitElement(name, element, file, buffer)
    }

    /**
     * Resolves the fully qualified name of an entity to its parent entity.
     * _resolveParent(a.b.c.D) -> CSN {a.b.c}
     * @param {string} name fully qualified name of the entity to resolve the parent of.
     * @returns {CSN} the resolved parent CSN.
     */
    _resolveParent(name) {
        return this.csn.definitions[name.split('.').slice(0, -1).join('.')]
    }

    /**
     * Resolves a fully qualified identifier to a namespace.
     * In an identifier 'a.b.c.D.E', the namespace is the part of the identifier
     * read from left to right which does not contain a kind 'context' or 'service'.
     * That is, if in the above example 'D' is a context and 'E' is a service,
     * the resulting namespace is 'a.b.c'.
     * @param {string[]} pathParts the distinct parts of the namespace, i.e. ['a','b','c','D','E']
     * @returns {string} the namespace's name, i.e. 'a.b.c'.
     */
    _resolveNamespace(pathParts) {
        let result
        while (result === undefined) {
            const path = pathParts.join('.')
            const def = this.csn.definitions[path]
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

    /**
     * Resolves an element's type to either a builtin or a user defined type. 
     * Enriched with additional information for improved printout (see return type).
     * @param {CSN} element the CSN element to resolve the type for.
     * @param {SourceFile} file source file for context.
     * @returns {TypeResolveInfo} description of the resolved type
     */
    resolveType(element, file) {
        // while resolving inline declarations, it can happen that we land here
        // with an already resolved type. In that case, just return the type we have.
        if (element && Object.hasOwn(element, 'isBuiltin')) { return element }

        const result = {
            isBuiltin: false, // will be rectified in the corresponding handlers, if needed
            isInlineDeclaration: false,
            isForeignKeyReference: false,
        }

        // FIXME: switch case
        if (element?.type === undefined) {
            // "fallback" type "empty object". May be overriden via _resolveInlineDeclarationType
            // later on with an inline declaration
            result.type = '{}'
            result.isInlineDeclaration = true
        } else {
            this._resolvePotentialReferenceType(element.type, result, file)
        }

        // objects and arrays
        if (element?.items) {
            this._resolveInlineDeclarationType(element.items, result, file)
        } else if (element?.elements) {
            this._resolveInlineDeclarationType(element.elements, result, file)
        }

        if (result.isBuiltin === false && result.isInlineDeclaration === false && !result.plainName) {
            this.logger.warning(`Plain name is empty for ${element?.type ?? '<empty>'}. This will probably cause issues.`)
        }
        return result
    }


    /**
     * Resolves an inline declaration of a type.
     * We can encounter declarations like:
     * 
     * record : array of {
     *   column : String;
     *   data   : String;
     * }
     * 
     * These have to be resolved to a new type.
     * 
     * @param {any[]} items the properties of the inline declaration.
     * @param {TypeResolveInfo} into @see resolveType()
     * @param {SourceFile} relativeToindent the sourcefile in which we have found the reference to the type.
     *  This is important to correctly detect when a field in the inline declaration is referencing
     *  types from the CWD. In that case, we will not add an import for that type and not add a namespace-prefix.
     */
    _resolveInlineDeclarationType(items, into, relativeTo) {
        return this.inlineDeclarationResolver.resolveInlineDeclaration(items, into, relativeTo)
    }

    /**
     * Attempts to resolve a type that could reference another type.
     * @param {?} val 
     * @param {TypeResolveInfo} into see resolveType()
     * @param {SourceFile} file only needed as we may call _resolveInlineDeclarationType from here. Will be expelled at some point.
     */
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

    /**
     * Convenience method to shave off the namespace of a fully qualified path.
     * More specifically, only the parts (reading from right to left) that are of
     * kind "entity" are retained.
     * a.b.c.Foo -> Foo
     * Bar -> Bar
     * sap.cap.Book.text -> Book.text (assuming Book and text are both of kind "entity")
     * @param {string} p path
     * @returns {string} the entity name without leading namespace.
     */
    _trimNamespace(p) {
        // start on right side, go up while we have an entity at hand
        // we cant start on left side, as that clashes with undefined entities like "sap"
        const parts = p.split('.')
        if (parts.length <= 1) {
            return p
        }

        let qualifier = parts.join('.')
        while (
            this.csn.definitions[qualifier] &&
            ['entity', 'type', 'aspect'].includes(this.csn.definitions[qualifier].kind)
        ) {
            parts.pop()
            qualifier = parts.join('.')
        }

        return qualifier ? p.substring(qualifier.length + 1) : p
    }

    /**
     * Attempts to resolve a string to a type.
     * String is supposed to refer to either a builtin type
     * or any type defined in CSN.
     * @param {string} t fully qualified type, like cds.String, or a.b.c.d.Foo
     * @param {TypeResolveInfo} into optional dictionary to fill by reference, see resolveType()
     * @returns @see resolveType
     */
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
        } else if (t in this.csn.definitions) {
            // user-defined type
            result.type = this._trimNamespace(util.singular4(this.csn.definitions[t])) //(path[path.length - 1])
            result.isBuiltin = false
            result.path = new Path(path) // FIXME: relative to current file
            result.csn = this.csn.definitions[t]
            result.plainName = this._trimNamespace(t)
        } else {
            // type offered by some library
            const lib = this.libraries.find(lib => lib.offers(t))
            if (lib) {
                // only use the last name of the (fully qualified) type name in this case.
                // We can not use _trimNamespace, as that actually does a semantic lookup within the CSN.
                // But entities that are found in libraries are not part of that CSN and have therefore be
                // separated from their namespace in a more barbarian way.
                // Luckily, this is not an issue, as libraries are supposed to be flat. So we can assume the
                // last portion of the type to refer to the entity.
                // We use this plain name as type name because consider:
                //
                // ```cds
                // entity Book { title: hana.VARCHAR }
                // ```
                //
                // ```ts
                // import * as _cds_hana from '../../cds/hana'
                // class Book { title: _cds_hana.cds.hana.VARCHAR }  // <- how it would be without discarding the namespace
                // class Book { title: _cds_hana.VARCHAR } // <- how we want it to look
                // ```
                const plain = t.split('.').at(-1)
                lib.referenced = true
                result.type =  plain
                result.isBuiltin = false
                result.path = lib.path
                result.csn = { name: t }
                result.plainName = plain
            } else {
                throw new Error(`Can not resolve '${t}' to any builtin, library-, or user defined type.`)
            }            
        }

        return result
    }
}

/**
 * Writes the accompanying jsconfig.json file to the specified paths.
 * Tries to merge nicely if an existing file is found.
 * @param path {string} filepath to jsconfig.json.
 * @param logger {import('./logging').Logger} logger
 */
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

/**
 * Compiles a .cds file to Typescript types.
 * @param inputFile {string} path to input .cds file
 * @param parameters {CompileParameters} path to root directory for all generated files, min log level, etc.
 */
const compileFromFile = async (inputFile, parameters) => {
    const paths = typeof inputFile === 'string' ? normalize(inputFile) : inputFile.map(f => normalize(f))
    const csn = await cds.linked(await cds.load(paths, { docs: true, flavor: 'xtended' }))
    return compileFromCSN(csn, parameters)
}

/**
 * Compiles a CSN object to Typescript types.
 * @param csn {CSN}
 * @param parameters {CompileParameters} path to root directory for all generated files, min log level
 */
const compileFromCSN = async (csn, parameters) => {
    const envSettings = cds.env?.typer ?? {}
    parameters = { ...parameters, ...envSettings }
    const logger = new Logger()
    logger.addFrom(parameters.logLevel)
    if (parameters.jsConfigPath) {
        writeJsConfig(parameters.jsConfigPath, logger)
    }
    return writeout(
        parameters.outputDirectory,
        Object.values(new Visitor(csn, parameters, logger).getWriteoutFiles())
    )
}

module.exports = {
    Visitor,
    compileFromFile,
    compileFromCSN,
}
