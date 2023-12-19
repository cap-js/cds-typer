'use strict'

const util = require('./util')

const { amendCSN, isView, isUnresolved } = require('./csn')
// eslint-disable-next-line no-unused-vars
const { SourceFile, baseDefinitions, Buffer } = require('./file')
const { FlatInlineDeclarationResolver, StructuredInlineDeclarationResolver } = require('./components/inline')
const { Resolver } = require('./components/resolver')
const { Logger } = require('./logging')
const { docify } = require('./components/wrappers')
const { csnToEnumPairs, propertyToInlineEnumName, isInlineEnumType } = require('./components/enum')

 /** @typedef {import('./file').File} File */
 /** @typedef {{ entity: String }} Context */

 /** 
 * @typedef { {
 *    rootDirectory: string, 
 *    logLevel: number, 
 *    jsConfigPath?: string
 * }} CompileParameters
 */

 /** 
 * - `propertiesOptional = true` -> all properties are generated as optional ?:. (standard CAP behaviour, where properties be unavailable)
 * - `inlineDeclarations = 'structured'` -> @see inline.StructuredInlineDeclarationResolver
 * - `inlineDeclarations = 'flat'` -> @see inline.FlatInlineDeclarationResolver
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

const defaults = {
    // FIXME: add defaults for remaining parameters
    propertiesOptional: true,
    inlineDeclarations: 'flat'
}

class Visitor {
    /**
     * Gathers all files that are supposed to be written to
     * the type directory. Including generated source files,
     * as well as library files.
     * @returns {File[]} a full list of files to be written
     */
    getWriteoutFiles() {
        return Object.values(this.files).concat(this.resolver.getUsedLibraries())
    }

    /**
     * @param {{xtended: CSN, inferred: CSN}} csn root CSN
     * @param {VisitorOptions} options
     */
    constructor(csn, options = {}, logger = new Logger()) {
        amendCSN(csn.xtended)
        this.options = { ...defaults, ...options }
        this.logger = logger
        this.csn = csn

        /** @type {Context[]} **/
        this.contexts = []

        /** @type {Resolver} */
        this.resolver = new Resolver(this)

        /** @type {Object<string, File>} */
        this.files = {}
        this.files[baseDefinitions.path.asIdentifier()] = baseDefinitions
        this.inlineDeclarationResolver =
            this.options.inlineDeclarations === 'structured'
                ? new StructuredInlineDeclarationResolver(this)
                : new FlatInlineDeclarationResolver(this)

        this.visitDefinitions()
    }

    /**
     * Determines the file corresponding to the namespace.
     * If no such file exists yet, it is created first.
     * @param {string} path the name of the namespace (foo.bar.baz)
     * @returns {SourceFile} the file corresponding to that namespace name
     */
    getNamespaceFile(path) {
        return (this.files[path] ??= new SourceFile(path))
    }

    /**
     * Visits all definitions within the CSN definitions.
     */
    visitDefinitions() {
        for (const [name, entity] of Object.entries(this.csn.xtended.definitions)) {
            if (isView(entity)) {
                this.visitEntity(name, this.csn.inferred.definitions[name])
            } else if (!isUnresolved(entity)) {
                this.visitEntity(name, entity)
            } else {
                this.logger.warning(`Skipping unresolved entity: ${name}`)
            }
        }
        // FIXME: optimise
        // We are currently working with two flavours of CSN:
        // xtended, as it is as close as possible to an OOP class hierarchy
        // inferred, as it contains information missing in xtended
        // This is less than optimal and has to be revisited at some point!
        const handledKeys = new Set(Object.keys(this.csn.xtended.definitions))
        // we are looking for autoexposed entities in services
        const missing = Object.entries(this.csn.inferred.definitions).filter(([key]) => !key.endsWith('.texts') &&!handledKeys.has(key))
        for (const [name, entity] of missing) {
            // instead of using the definition from inferred CSN, we refer to the projected entity from xtended CSN instead.
            // The latter contains the CSN fixes (propagated foreign keys, etc) and none of the localised fields we don't handle yet.
            if (entity.projection) {
                const targetName = entity.projection.from.ref[0] 
                // FIXME: references to types of entity properties may be missing from xtendend flavour (see #103)
                // this should be revisted once we settle on a single flavour.
                const target = this.csn.xtended.definitions[targetName] ?? this.csn.inferred.definitions[targetName]
                this.visitEntity(name, target)
            } else {
                this.logger.error(`Expecting an autoexposed projection within a service. Skipping ${name}`)
            }
        }
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
    #aspectify(name, entity, buffer, cleanName = undefined) {
        const clean = cleanName ?? this.resolver.trimNamespace(name)
        const ns = this.resolver.resolveNamespace(name.split('.'))
        const file = this.getNamespaceFile(ns)

        const identSingular = (name) => name
        const identAspect = (name) => `_${name}Aspect`

        this.contexts.push({ entity: name })

        // CLASS ASPECT
        buffer.add(`export function ${identAspect(clean)}<TBase extends new (...args: any[]) => object>(Base: TBase) {`)
        buffer.indent()
        buffer.add(`return class ${clean} extends Base {`)
        buffer.indent()

        const enums = []
        const exclusions = new Set(entity.projection?.excluding ?? [])
        const elements = Object.entries(entity.elements ?? {}).filter(([ename]) => !exclusions.has(ename))
        for (const [ename, element] of elements) {
            this.visitElement(ename, element, file, buffer)

            // make foreign keys explicit
            if ('target' in element) {
                // lookup in cds.definitions can fail for inline structs.
                // We don't really have to care for this case, as keys from such structs are _not_ propagated to
                // the containing entity.
                for (const [kname, kelement] of Object.entries(this.csn.xtended.definitions[element.target]?.keys ?? {})) {
                    if (this.resolver.getMaxCardinality(element) === 1) {
                        kelement.isRefNotNull = !!element.notNull || !!element.key
                        this.visitElement(`${ename}_${kname}`, kelement, file, buffer)
                    }
                }
            }

            // store inline enums for later handling, as they have to go into one common "static elements" wrapper
            if (isInlineEnumType(element, this.csn.xtended)) {
                enums.push(element)
            }
        }

        buffer.indent()
        for (const e of enums) {
            buffer.add(`static ${e.name} = ${propertyToInlineEnumName(clean, e.name)}`)
            file.addInlineEnum(clean, name, e.name, csnToEnumPairs(e, {unwrapVals: true}))
        }
        buffer.add('static actions: {')
        buffer.indent()
        for (const [aname, action] of Object.entries(entity.actions ?? {})) {
            buffer.add(
                SourceFile.stringifyLambda({
                    name: aname,
                    parameters: this.#stringifyFunctionParams(action.params, file),
                    returns: action.returns ? this.resolver.resolveAndRequire(action.returns, file).typeName : 'any'
                    //initialiser: `undefined as unknown as typeof ${clean}.${aname}`,
                })
            )
        }
        buffer.outdent()
        buffer.outdent()
        buffer.add('}') // end of actions

        buffer.outdent()
        buffer.add('};') // end of generated class
        buffer.outdent()
        buffer.add('}')  // end of aspect

        // CLASS WITH ADDED ASPECTS
        file.addImport(baseDefinitions.path)
        const rhs = (entity.includes ?? [])
            .map((parent) => {
                const [ns, n] = this.resolver.untangle(parent)
                file.addImport(ns)
                return [ns, n]
            })
            .concat([[undefined, clean]]) // add own aspect without namespace AFTER imports were created
            .reverse() // reverse so that own aspect A is applied before extensions B,C: B(C(A(Entity)))
            .reduce(
                (wrapped, [ns, n]) =>
                    !ns || ns.isCwd(file.path.asDirectory())
                        ? `${identAspect(n)}(${wrapped})`
                        : `${ns.asIdentifier()}.${identAspect(n)}(${wrapped})`,
                `${baseDefinitions.path.asIdentifier()}.Entity`
            )

        buffer.add(`export class ${identSingular(clean)} extends ${rhs} {${this.#staticClassContents(clean, entity).join('\n')}}`)
        //buffer.add(`export type ${clean} = InstanceType<typeof ${identSingular(clean)}>`)
        this.contexts.pop()
    }

    #isDraftEnabled(entity) {
        return entity['@odata.draft.enabled'] === true
    }

    #staticClassContents(clean, entity) {
        return this.#isDraftEnabled(entity) ? [`static drafts: typeof ${clean}`] : []
    }

    #printEntity(name, entity) {
        // static .name has to be defined more forcefully: https://github.com/microsoft/TypeScript/issues/442
        const overrideNameProperty = (clazz, content) => `Object.defineProperty(${clazz}, 'name', { value: '${content}' })`
        const clean = this.resolver.trimNamespace(name)
        const ns = this.resolver.resolveNamespace(name.split('.'))
        const file = this.getNamespaceFile(ns)
        // entities are expected to be in plural anyway, so we would favour the regular name.
        // If the user decides to pass a @plural annotation, that gets precedence over the regular name.
        let plural = this.resolver.trimNamespace(util.getPluralAnnotation(entity) ? util.plural4(entity, false) : name)
        const singular = this.resolver.trimNamespace(util.singular4(entity, true))
        // trimNamespace does not properly detect scoped entities, like A.B where both A and B are
        // entities. So to see if we would run into a naming collision, we forcefully take the last
        // part of the name, so "A.B" and "A.Bs" just become "B" and "Bs" to be compared.
        // FIXME: put this in a util function
        if (singular.split('.').at(-1) === plural.split('.').at(-1)) {
            plural += '_'
            this.logger.warning(
                `Derived singular and plural forms for '${singular}' are the same. This usually happens when your CDS entities are named following singular flexion. Consider naming your entities in plural or providing '@singular:'/ '@plural:' annotations to have a clear distinction between the two. Plural form will be renamed to '${plural}' to avoid compilation errors within the output.`
            )
        }
        if (singular in this.csn.xtended.definitions) {
            this.logger.error(
                `Derived singular '${singular}' for your entity '${name}', already exists. The resulting types will be erronous. Please consider using '@singular:'/ '@plural:' annotations in your model to resolve this collision.`
            )
        }
        file.addClass(singular, name)
        file.addClass(plural, name)

        const parent = this.resolver.resolveParent(entity.name)
        const buffer = parent && parent.kind === 'entity'
            ? file.getSubNamespace(this.resolver.trimNamespace(parent.name))
            : file.classes

        // we can't just use "singular" here, as it may have the subnamespace removed:
        // "Books.text" is just "text" in "singular". Within the inflected exports we need
        // to have Books.texts = Books.text, so we derive the singular once more without cutting off the ns.
        // Directly deriving it from the plural makes sure we retain any parent namespaces of kind "entity",
        // which would not be possible while already in singular form, as "Book.text" could not be resolved in CSN.
        // edge case: @singular annotation present. singular4 will take care of that.
        file.addInflection(util.singular4(entity, true), plural, clean)
        if ('doc' in entity) {
            docify(entity.doc).forEach((d) => buffer.add(d))
        }

        this.#aspectify(name, entity, buffer, singular)

        // PLURAL
        if (plural.includes('.')) {
            // Foo.text -> namespace Foo { class text { ... }}
            plural = plural.split('.').pop()
        }
        // plural can not be a type alias to $singular[] but needs to be a proper class instead,
        // so it can get passed as value to CQL functions.
        buffer.add(`export class ${plural} extends Array<${singular}> {${this.#staticClassContents(singular, entity).join('\n')}}`)
        buffer.add(overrideNameProperty(singular, entity.name))
        buffer.add(overrideNameProperty(plural, entity.name))
        buffer.add('')
    }

    /**
     * Stringifies function parameters in preparation of passing them to {@link SourceFile.stringifyLambda}.
     * Resolves all parameters to a pair of parameter name and name of the resolved type.
     * Also filters out parameters that indicate a binding parameter ({@link https://cap.cloud.sap/docs/releases/jan23#simplified-syntax-for-binding-parameters}).
     * @param {[string, object][]} params - parameter list as found in CSN.
     * @param {File} file - source file relative to which the parameter types should be resolved.
     * @returns {[string, string][]} pair of names and types.
     */
    #stringifyFunctionParams(params, file) {
        return params
            ? Object.entries(params)
                // filter params of type '[many] $self', as they are not to be part of the implementation
                .filter(([, type]) => type?.type !== '$self' && !(type.items?.type === '$self'))
                .map(([name, type]) => [
                    name,
                    this.resolver.visitor.inlineDeclarationResolver.getPropertyDatatype(this.resolver.resolveAndRequire(type, file)),
                ])
            : []
    }

    #printFunction(name, func) {
        // FIXME: mostly duplicate of printAction -> reuse
        this.logger.debug(`Printing function ${name}:\n${JSON.stringify(func, null, 2)}`)
        const ns = this.resolver.resolveNamespace(name.split('.'))
        const file = this.getNamespaceFile(ns)
        const params = this.#stringifyFunctionParams(func.params, file)
        const returns = this.resolver.visitor.inlineDeclarationResolver.getPropertyDatatype(
            this.resolver.resolveAndRequire(func.returns, file)
        )
        file.addFunction(name.split('.').at(-1), params, returns)
    }

    #printAction(name, action) {
        this.logger.debug(`Printing action ${name}:\n${JSON.stringify(action, null, 2)}`)
        const ns = this.resolver.resolveNamespace(name.split('.'))
        const file = this.getNamespaceFile(ns)
        const params = this.#stringifyFunctionParams(action.params, file)
        const returns = this.resolver.visitor.inlineDeclarationResolver.getPropertyDatatype(
            this.resolver.resolveAndRequire(action.returns, file)
        )
        file.addAction(name.split('.').at(-1), params, returns)
    }

    #printType(name, type) {
        this.logger.debug(`Printing type ${name}:\n${JSON.stringify(type, null, 2)}`)
        const clean = this.resolver.trimNamespace(name)
        const ns = this.resolver.resolveNamespace(name.split('.'))
        const file = this.getNamespaceFile(ns)
        if ('enum' in type) {
            file.addEnum(name, clean, csnToEnumPairs(type))
        } else {
            // alias
            file.addType(name, clean, this.resolver.resolveAndRequire(type, file).typeName)
        }
        // TODO: annotations not handled yet
    }

    #printAspect(name, aspect) {
        this.logger.debug(`Printing aspect ${name}`)
        const clean = this.resolver.trimNamespace(name)
        const ns = this.resolver.resolveNamespace(name.split('.'))
        const file = this.getNamespaceFile(ns)
        // aspects are technically classes and can therefore be added to the list of defined classes.
        // Still, when using them as mixins for a class, they need to already be defined.
        // So we separate them into another buffer which is printed before the classes.
        file.addClass(clean, name)
        file.aspects.add(`// the following represents the CDS aspect '${clean}'`)
        this.#aspectify(name, aspect, file.aspects, clean)
    }

    #printEvent(name, event) {
        this.logger.debug(`Printing event ${name}`)
        const clean = this.resolver.trimNamespace(name)
        const ns = this.resolver.resolveNamespace(name.split('.'))
        const file = this.getNamespaceFile(ns)
        file.addEvent(clean, name)
        const buffer = file.events.buffer
        buffer.add('// event')
        buffer.add(`export class ${clean} {`)
        buffer.indent()
        const propOpt = this.options.propertiesOptional
        this.options.propertiesOptional = false
        for (const [ename, element] of Object.entries(event.elements ?? {})) {
            this.visitElement(ename, element, file, buffer)
        }
        this.options.propertiesOptional = propOpt
        buffer.outdent()
        buffer.add('}')
    }

    #printService(name, service) {
        this.logger.debug(`Printing service ${name}:\n${JSON.stringify(service, null, 2)}`)
        const ns = this.resolver.resolveNamespace(name)
        const file = this.getNamespaceFile(ns)
        // service.name is clean of namespace
        file.services.buffer.add(`export default { name: '${service.name}' }`)
        file.addService(service.name)
    }

    /**
     * Visits a single entity from the CSN's definition field.
     * Will call #printEntity or #printAction based on the entity's kind.
     * @param {string} name name of the entity, fully qualified as is used in the definition field.
     * @param {CSN} entity CSN data belonging to the entity to perform lookups in.
     */
    visitEntity(name, entity) {
        switch (entity.kind) {
            case 'entity':
                this.#printEntity(name, entity)
                break
            case 'action':
                this.#printFunction(name, entity)
                break
            case 'function':
                this.#printAction(name, entity)
                break
            case 'type':
                this.#printType(name, entity)
                break
            case 'aspect':
                this.#printAspect(name, entity)
                break
            case 'event':
                this.#printEvent(name, entity)
                break
            case 'service':
                this.#printService(name, entity)
                break
            default:
                this.logger.error(`Unhandled entity kind '${entity.kind}'.`)
        }
    }

    /**
     * A self reference is a property that references the class it appears in.
     * They need to be detected on CDS level, as the emitted TS types will try to
     * refer to types via their alias that hides the aspectification.
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
     * Visits a single element in an entity.
     * @param {string} name name of the element
     * @param {import('./components/resolver').CSN} element CSN data belonging to the the element.
     * @param {SourceFile} file the namespace file the surrounding entity is being printed into.
     * @param {Buffer} buffer buffer to add the definition to. If no buffer is passed, the passed file's class buffer is used instead.
     * @returns @see InlineDeclarationResolver.visitElement
     */
    visitElement(name, element, file, buffer) {
        return this.inlineDeclarationResolver.visitElement(name, element, file, buffer)
    }
}

module.exports = {
    Visitor
}
