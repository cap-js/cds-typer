'use strict'

const util = require('./util')

const { amendCSN, isView, isUnresolved, propagateForeignKeys, isDraftEnabled, isType, isProjection, getMaxCardinality } = require('./csn')
// eslint-disable-next-line no-unused-vars
const { SourceFile, FileRepository, Buffer } = require('./file')
const { FlatInlineDeclarationResolver, StructuredInlineDeclarationResolver } = require('./components/inline')
const { Resolver } = require('./resolution/resolver')
const { LOG } = require('./logging')
const { docify } = require('./components/wrappers')
const { csnToEnumPairs, propertyToInlineEnumName, isInlineEnumType, stringifyEnumType } = require('./components/enum')
const { isReferenceType } = require('./components/reference')
const { empty } = require('./components/typescript')
const { baseDefinitions } = require('./components/basedefs')
const { EntityRepository } = require('./resolution/entity')
const { last } = require('./components/identifier')

/** @typedef {import('./file').File} File */
/** @typedef {import('./typedefs').visitor.Context} Context */
/** @typedef {import('./typedefs').visitor.CompileParameters} CompileParameters */
/** @typedef {import('./typedefs').visitor.VisitorOptions} VisitorOptions */
/** @typedef {import('./typedefs').visitor.Inflection} Inflection */

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
        return this.fileRepository.getFiles().concat(this.resolver.getUsedLibraries())
    }

    /**
     * @param {{xtended: CSN, inferred: CSN}} csn - root CSN
     * @param {VisitorOptions} options - the options
     */
    constructor(csn, options = {}) {
        amendCSN(csn.xtended)
        propagateForeignKeys(csn.inferred)
        this.options = { ...defaults, ...options }
        this.csn = csn

        /** @type {Context[]} **/
        this.contexts = []

        /** @type {Resolver} */
        this.resolver = new Resolver(this)

        /** @type {EntityRepository} */
        this.entityRepository = new EntityRepository(this.resolver)

        /** @type {FileRepository} */
        this.fileRepository = new FileRepository()
        this.fileRepository.add(baseDefinitions.path.asNamespace(), baseDefinitions)
        this.inlineDeclarationResolver =
            this.options.inlineDeclarations === 'structured'
                ? new StructuredInlineDeclarationResolver(this)
                : new FlatInlineDeclarationResolver(this)

        this.visitDefinitions()
    }

    /**
     * Visits all definitions within the CSN definitions.
     */
    visitDefinitions() {
        for (const [name, entity] of Object.entries(this.csn.xtended.definitions)) {
            if (isView(entity)) {
                this.visitEntity(name, this.csn.inferred.definitions[name])
            } else if (isProjection(entity) || !isUnresolved(entity)) {
                this.visitEntity(name, entity)
            } else {
                LOG.warn(`Skipping unresolved entity: ${name}`)
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
                LOG.error(`Expecting an autoexposed projection within a service. Skipping ${name}`)
            }
        }
    }

    /**
     * Retrieves all the keys from an entity.
     * That is: all keys that are present in both inferred, as well as xtended flavour.
     * @param {string} fq - fully qualified name of the entity
     * @returns {[string, object][]} array of key name and key element pairs
     */
    #keys(fq) {
        // FIXME: this is actually pretty bad, as not only have to propagate keys through
        // both flavours of CSN (see constructor), but we are now also collecting them from
        // both flavours and deduplicating them.
        // xtended contains keys that have been inherited from parents
        // inferred contains keys from queried entities (thing `entity Foo as select from Bar`, where Bar has keys)
        // So we currently need them both.
        return Object.entries({
            ...this.csn.inferred.definitions[fq]?.keys ?? {},
            ...this.csn.xtended.definitions[fq]?.keys ?? {}
        })
    }

    /**
     * Transforms an entity or CDS aspect into a JS aspect (aka mixin).
     * That is, for an element A we get:
     * - the function A(B) to mix the aspect into another class B
     * - the const AXtended which represents the entity A with all of its aspects mixed in (this const is not exported)
     * - the type A to use for external typing and is derived from AXtended.
     * @param {string} fq - the name of the entity
     * @param {CSN} entity - the pointer into the CSN to extract the elements from
     * @param {Buffer} buffer - the buffer to write the resulting definitions into
     * @param {{cleanName?: string}} options - additional options
     */
    #aspectify(fq, entity, buffer, options = {}) {
        const info = this.entityRepository.getByFq(fq)
        const clean = options?.cleanName ?? info.withoutNamespace
        const { namespace } = info
        const file = this.fileRepository.getNamespaceFile(namespace)
        const identSingular = name => name
        const identAspect = name => `_${name}Aspect`
        const toAspectIdent = (wrapped, [ns, n, fq]) => {
            // types are not inflected, so don't change those to singular
            const refersToType = isType(this.csn.inferred.definitions[fq])
            const ident = identAspect(refersToType 
                ? n 
                : this.resolver.inflect({csn: this.csn.inferred.definitions[fq], plainName: n}).singular
            )
            return !ns || ns.isCwd(file.path.asDirectory())
                ? `${ident}(${wrapped})`
                : `${ns.asIdentifier()}.${ident}(${wrapped})` 
        }
        const ancestors = (entity.includes ?? [])
            .map(parent => {
                const { namespace, entityName } = this.entityRepository.getByFq(parent)
                file.addImport(namespace)
                return [namespace, entityName, parent]
            })
            .reverse() // reverse so that own aspect A is applied before extensions B,C: B(C(A(Entity)))
            .reduce(toAspectIdent, 'Base')

        this.contexts.push({ entity: fq })

        // CLASS ASPECT
        buffer.addIndentedBlock(`export function ${identAspect(clean)}<TBase extends new (...args: any[]) => object>(Base: TBase) {`, () => {
            buffer.addIndentedBlock(`return class extends ${ancestors} {`, () => {
                const enums = []
                for (let [ename, element] of Object.entries(entity.elements ?? {})) {
                    if (element.target && /\.texts?/.test(element.target)) {
                        LOG.warn(`referring to .texts property in ${fq}. This is currently not supported and will be ignored.`)
                        continue
                    }
                    this.visitElement(ename, element, file, buffer)

                    // make foreign keys explicit
                    if ('target' in element) {
                        // lookup in cds.definitions can fail for inline structs.
                        // We don't really have to care for this case, as keys from such structs are _not_ propagated to
                        // the containing entity.
                        for (const [kname, originalKeyElement] of this.#keys(element.target)) {
                            if (getMaxCardinality(element) === 1 && typeof element.on !== 'object') {  // FIXME: kelement?
                                const foreignKey = `${ename}_${kname}`
                                if (Object.hasOwn(entity.elements, foreignKey)) {
                                    LOG.error(`Attempting to generate a foreign key reference called '${foreignKey}' in type definition for entity ${fq}. But a property of that name is already defined explicitly. Consider renaming that property.`)
                                } else {
                                    const kelement = Object.assign(Object.create(originalKeyElement), {
                                        isRefNotNull: !!element.notNull || !!element.key
                                    })
                                    this.visitElement(foreignKey, kelement, file, buffer)
                                }
                            }
                        }
                    }

                    // store inline enums for later handling, as they have to go into one common "static elements" wrapper
                    if (isInlineEnumType(element, this.csn.xtended)) {
                        enums.push(element)
                    }
                }

                buffer.addIndented(() => {
                    for (const e of enums) {
                        buffer.add(`static ${e.name} = ${propertyToInlineEnumName(clean, e.name)}`)
                        file.addInlineEnum(clean, fq, e.name, csnToEnumPairs(e, {unwrapVals: true}))
                    }
                    const actions = Object.entries(entity.actions ?? {})
                    if (actions.length) {
                        buffer.addIndentedBlock('static readonly actions: {',
                            actions.map(([aname, action]) => SourceFile.stringifyLambda({
                                name: aname,
                                parameters: this.#stringifyFunctionParams(action.params, file),
                                returns: action.returns ? this.resolver.resolveAndRequire(action.returns, file).typeName : 'any',
                                kind: action.kind
                            }))
                            , '}') // end of actions
                    } else {
                        buffer.add(`static readonly actions: ${empty}`)
                    }
                })
            }, '};') // end of generated class
        }, '}') // end of aspect

        // CLASS WITH ADDED ASPECTS
        file.addImport(baseDefinitions.path)
        buffer.add(`export class ${identSingular(clean)} extends ${toAspectIdent(`${baseDefinitions.path.asIdentifier()}.Entity`, [undefined, clean, fq])} {${this.#staticClassContents(clean, entity).join('\n')}}`)
        this.contexts.pop()
    }

    #staticClassContents(clean, entity) {
        return isDraftEnabled(entity) ? [`static drafts: typeof ${clean}`] : []
    }

    #printEntity(fq, entity) {
        // static .name has to be defined more forcefully: https://github.com/microsoft/TypeScript/issues/442
        const overrideNameProperty = (clazz, content) => `Object.defineProperty(${clazz}, 'name', { value: '${content}' })`
        const { namespace: ns, entityName: clean, inflection } = this.entityRepository.getByFq(fq)
        const file = this.fileRepository.getNamespaceFile(ns)
        let { singular, plural } = inflection

        // trimNamespace does not properly detect scoped entities, like A.B where both A and B are
        // entities. So to see if we would run into a naming collision, we forcefully take the last
        // part of the name, so "A.B" and "A.Bs" just become "B" and "Bs" to be compared.
        if (last(plural) === `${last(singular)}_`) {
            LOG.warn(
                `Derived singular and plural forms for '${singular}' are the same. This usually happens when your CDS entities are named following singular flexion. Consider naming your entities in plural or providing '@singular:'/ '@plural:' annotations to have a clear distinction between the two. Plural form will be renamed to '${plural}' to avoid compilation errors within the output.`
            )
        }

        // as types are not inflected, their singular will always clash and there is also no plural for them anyway -> skip
        // if the user defined their entities in singular form we would also have a false positive here -> skip
        const namespacedSingular = `${ns.asNamespace()}.${singular}`
        if (!isType(entity) && namespacedSingular !== fq && namespacedSingular in this.csn.xtended.definitions) {
            LOG.error(
                `Derived singular '${singular}' for your entity '${fq}', already exists. The resulting types will be erronous. Consider using '@singular:'/ '@plural:' annotations in your model or move the offending declarations into different namespaces to resolve this collision.`
            )
        }
        file.addClass(singular, fq)
        file.addClass(plural, fq)

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
        docify(entity.doc).forEach(d => { buffer.add(d) })

        // in case of projections `entity` is empty -> retrieve from inferred csn where the actual properties are rolled out
        const target = isProjection(entity) || isView(entity)
            ? this.csn.inferred.definitions[fq]
            : entity

        // draft enablement is stored in csn.xtended. Iff we took the entity from csn.inferred, we have to carry the draft-enablement over at this point
        target['@odata.draft.enabled'] = isDraftEnabled(entity)

        this.#aspectify(fq, target, buffer, { cleanName: singular })

        buffer.add(overrideNameProperty(singular, entity.name))
        buffer.add(`Object.defineProperty(${singular}, 'is_singular', { value: true })`)

        // PLURAL

        // types do not receive a plural
        if (!isType(entity)) {
            if (plural.includes('.')) {
                // Foo.text -> namespace Foo { class text { ... }}
                plural = last(plural)
            }
            // plural can not be a type alias to $singular[] but needs to be a proper class instead,
            // so it can get passed as value to CQL functions.
            const additionalProperties = this.#staticClassContents(singular, entity)
            additionalProperties.push('$count?: number')
            buffer.add(`export class ${plural} extends Array<${singular}> {${additionalProperties.join('\n')}}`)
            buffer.add(overrideNameProperty(plural, entity.name))
        }
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
                    this.#stringifyFunctionParamType(type, file)
                ])
            : []
    }

    #stringifyFunctionParamType(type, file) {
        // if type.type is not 'cds.String', 'cds.Integer', ..., then we are actually looking
        // at a named enum type. In that case also resolve that type name
        if (type.enum && this.resolver.builtinResolver.resolveBuiltin(type.type)) return stringifyEnumType(csnToEnumPairs(type))
        const paramType = this.resolver.resolveAndRequire(type, file)
        return this.inlineDeclarationResolver.getPropertyDatatype(
            paramType,
            paramType.typeInfo.isArray || paramType.typeInfo.isDeepRequire ? paramType.typeName : paramType.typeInfo.inflection.singular
        )
    }

    /**
     * @param {string} fq - fully qualified name of the operation
     * @param {object} operation - CSN
     * @param {'function' | 'action'} kind - kind of operation
     */
    #printOperation(fq, operation, kind) {
        LOG.debug(`Printing operation ${fq}:\n${JSON.stringify(operation, null, 2)}`)
        const { namespace } = this.entityRepository.getByFq(fq)
        const file = this.fileRepository.getNamespaceFile(namespace)
        const params = this.#stringifyFunctionParams(operation.params, file)
        const returnType = operation.returns
            ? this.resolver.resolveAndRequire(operation.returns, file)
            : { typeName: 'void', typeInfo: { isArray: false, inflection: { singular: 'void', plural: 'void' } } }
        const returns = this.inlineDeclarationResolver.getPropertyDatatype(
            returnType,
            returnType.typeInfo.isArray ? returnType.typeName : returnType.typeInfo.inflection.singular
        )
        file.addOperation(last(fq), params, returns, kind)
    }

    #printType(fq, type) {
        LOG.debug(`Printing type ${fq}:\n${JSON.stringify(type, null, 2)}`)
        const { namespace, entityName } = this.entityRepository.getByFq(fq)
        const file = this.fileRepository.getNamespaceFile(namespace)
        // skip references to enums.
        // "Base" enums will always have a builtin type (don't skip those).
        // A type referencing an enum E will be considered an enum itself and have .type === E (skip).
        if ('enum' in type && !isReferenceType(type) && this.resolver.builtinResolver.resolveBuiltin(type.type)) {
            file.addEnum(fq, entityName, csnToEnumPairs(type))
        } else {
            // alias
            file.addType(fq, entityName, this.resolver.resolveAndRequire(type, file).typeName)
        }
        // TODO: annotations not handled yet
    }

    #printAspect(fq, aspect) {
        LOG.debug(`Printing aspect ${fq}`)
        const { namespace, entityName } = this.entityRepository.getByFq(fq)
        const file = this.fileRepository.getNamespaceFile(namespace)
        // aspects are technically classes and can therefore be added to the list of defined classes.
        // Still, when using them as mixins for a class, they need to already be defined.
        // So we separate them into another buffer which is printed before the classes.
        file.addClass(entityName, fq)
        file.aspects.add(`// the following represents the CDS aspect '${entityName}'`)
        this.#aspectify(fq, aspect, file.aspects, { cleanName: entityName })
    }

    #printEvent(fq, event) {
        LOG.debug(`Printing event ${fq}`)
        const { namespace, entityName } = this.entityRepository.getByFq(fq)
        const file = this.fileRepository.getNamespaceFile(namespace)
        file.addEvent(entityName, fq)
        const buffer = file.events.buffer
        buffer.add('// event')
        // only declare classes, as their properties are not optional, so we don't have to do awkward initialisation thereof.
        buffer.addIndentedBlock(`export declare class ${entityName} {`, () => {
            const propOpt = this.options.propertiesOptional
            this.options.propertiesOptional = false
            for (const [ename, element] of Object.entries(event.elements ?? {})) {
                this.visitElement(ename, element, file, buffer)
            }
            this.options.propertiesOptional = propOpt
        }, '}')
    }

    #printService(fq, service) {
        LOG.debug(`Printing service ${fq}:\n${JSON.stringify(service, null, 2)}`)
        const { namespace } = this.entityRepository.getByFq(fq)
        const file = this.fileRepository.getNamespaceFile(namespace)
        // service.name is clean of namespace
        file.services.buffer.add(`export default { name: '${service.name}' }`)
        file.addService(service.name)
    }

    /**
     * Visits a single entity from the CSN's definition field.
     * Will call #printEntity or #printAction based on the entity's kind.
     * @param {string} fq - name of the entity, fully qualified as is used in the definition field.
     * @param {CSN} entity - CSN data belonging to the entity to perform lookups in.
     */
    visitEntity(fq, entity) {
        switch (entity.kind) {
        case 'entity':
            this.#printEntity(fq, entity)
            break
        case 'action':
        case 'function':
            this.#printOperation(fq, entity, entity.kind)
            break
        case 'aspect':
            this.#printAspect(fq, entity)
            break
        case 'type': {
            // types like inline definitions can be used very similarly to entities.
            // They can be extended, contain inline enums, etc., so we treat them as entities.
            const handler = entity.elements ? this.#printEntity : this.#printType
            handler.call(this, fq, entity)
            break
        }
        case 'event':
            this.#printEvent(fq, entity)
            break
        case 'service':
            this.#printService(fq, entity)
            break
        default:
            LOG.debug(`Unhandled entity kind '${entity.kind}'.`)
        }
    }

    /**
     * A self reference is a property that references the class it appears in.
     * They need to be detected on CDS level, as the emitted TS types will try to
     * refer to types via their alias that hides the aspectification.
     * If we attempt to directly refer to this alias while it has not been fully created,
     * that will result in a TS error.
     * @param {string} fq - fully qualified name of the entity
     * @returns {boolean} true, if `entityName` refers to the surrounding class
     * @example
     * ```ts
     * class TreeNode {
     *   value: number
     *   parent: TreeNode // <- self reference
     * }
     * ```
     */
    isSelfReference(fq) {
        return fq === this.contexts.at(-1)?.entity
    }

    /**
     * Visits a single element in an entity.
     * @param {string} name - name of the element
     * @param {import('./resolution/resolver').CSN} element - CSN data belonging to the the element.
     * @param {SourceFile} file - the namespace file the surrounding entity is being printed into.
     * @param {Buffer} buffer - buffer to add the definition to. If no buffer is passed, the passed file's class buffer is used instead.
     * @returns @see InlineDeclarationResolver.visitElement
     */
    visitElement(name, element, file, buffer) {
        return this.inlineDeclarationResolver.visitElement(name, element, file, buffer)
    }
}

module.exports = {
    Visitor
}
