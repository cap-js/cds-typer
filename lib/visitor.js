'use strict'

const util = require('./util')

const { amendCSN, isView, isUnresolved, propagateForeignKeys, isDraftEnabled, isType, isProjection, getMaxCardinality, isViewOrProjection, isEnum } = require('./csn')
// eslint-disable-next-line no-unused-vars
const { SourceFile, FileRepository, Buffer, Path } = require('./file')
const { FlatInlineDeclarationResolver, StructuredInlineDeclarationResolver } = require('./components/inline')
const { Resolver } = require('./resolution/resolver')
const { LOG } = require('./logging')
const { docify, createPromiseOf, createUnionOf, createKeysOf } = require('./components/wrappers')
const { csnToEnumPairs, propertyToInlineEnumName, isInlineEnumType, stringifyEnumType } = require('./components/enum')
const { isReferenceType } = require('./components/reference')
const { empty } = require('./components/typescript')
const { baseDefinitions } = require('./components/basedefs')
const { EntityRepository, asIdentifier } = require('./resolution/entity')
const { last } = require('./components/identifier')
const { getPropertyModifiers } = require('./components/property')
const { configuration } = require('./config')

/** @typedef {import('./file').File} File */
/** @typedef {import('./typedefs').visitor.Context} Context */
/** @typedef {import('./typedefs').visitor.Inflection} Inflection */
/** @typedef {import('./typedefs').resolver.CSN} CSN */
/** @typedef {import('./typedefs').resolver.EntityCSN} EntityCSN */
/** @typedef {import('./typedefs').resolver.EnumCSN} EnumCSN */

class Visitor {
    /**
     * Gathers all files that are supposed to be written to
     * the type directory. Including generated source files,
     * as well as library files.
     * @returns {File[]} a full list of files to be written
     */
    getWriteoutFiles() {
        return [...this.fileRepository.getFiles(), ...this.resolver.getUsedLibraries()]
    }

    /**
     * @param {{xtended: CSN, inferred: CSN}} csn - root CSN
     */
    constructor(csn) {
        amendCSN(csn.xtended)
        propagateForeignKeys(csn.inferred)
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
            configuration.inlineDeclarations === 'structured'
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
                if (target.kind !== 'type') {
                    // skip if the target is a property, like in:
                    // books: Association to many Author.books ...
                    // as this would result in a type definition that
                    // name-clashes with the actual declaration of Author
                    this.visitEntity(name, target)
                }
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
     * @param {EntityCSN} entity - the entity to print the actions for
     * @param {Buffer} buffer - the buffer to write the actions into
     * @param {import('./typedefs').resolver.EntityInfo[]} ancestors - the fully qualified names of the ancestors of the entity
     * @param {SourceFile} file - the file the entity is being printed into
     */
    #printStaticActions(entity, buffer, ancestors, file) {
        // TODO: refactor away! All these printing functionalities need to go
        const actions = Object.entries(entity.actions ?? {})
        const inherited = ancestors.length
            ? ancestors.map(a => `typeof ${asIdentifier({info: a, relative: file.path})}.actions`).join(' & ') + ' & '
            : ''
        if (actions.length) {
            buffer.addIndentedBlock(`declare static readonly actions: ${inherited}{`,
                actions.map(([aname, action]) => SourceFile.stringifyLambda({
                    name: aname,
                    parameters: this.#stringifyFunctionParams(action.params, file),
                    returns: action.returns
                        ? this.resolver.resolveAndRequire(action.returns, file).typeName
                        : 'any',
                    kind: action.kind,
                    doc: docify(action.doc)
                })), '}'
            ) // end of actions
        } else {
            buffer.add(`declare static readonly actions: ${inherited}${empty}`)
        }
    }

    /**
     * @param {Buffer} buffer - the buffer to write the keys into
     * @param {string} clean - the clean name of the entity
     */
    #printStaticKeys(buffer, clean) {
        buffer.add(`declare static readonly keys: ${createKeysOf(clean)}`)
    }

    /**
     * Transforms an entity or CDS aspect into a JS aspect (aka mixin).
     * That is, for an element A we get:
     * - the function A(B) to mix the aspect into another class B
     * - the const AXtended which represents the entity A with all of its aspects mixed in (this const is not exported)
     * - the type A to use for external typing and is derived from AXtended.
     * @param {string} fq - the name of the entity
     * @param {EntityCSN} entity - the pointer into the CSN to extract the elements from
     * @param {Buffer} buffer - the buffer to write the resulting definitions into
     * @param {{cleanName?: string}} options - additional options
     */
    #aspectify(fq, entity, buffer, options = {}) {
        const info = this.entityRepository.getByFqOrThrow(fq)
        const clean = options?.cleanName ?? info.withoutNamespace
        const { namespace } = info
        const file = this.fileRepository.getNamespaceFile(namespace)
        const identSingular = (/** @type {string} */name) => name  // FIXME: remove
        //const identAspect = name => `_${name}Aspect`
        /** @param {string} name - the name */
        const identAspect = name => `_${name}Aspect`
        /**
         * @param {object} options - options
         * @param {Path} [options.ns] - namespace
         * @param {string} options.clean - the clean name of the entity
         * @param {string} options.fq - fully qualified name
         * @returns {string} the local identifier
         */
        // FIXME: replace with resolution/entity::asIdentifier
        const toLocalIdent = ({ns, clean, fq}) => {
            // types are not inflected, so don't change those to singular
            const csn = this.csn.inferred.definitions[fq]
            const ident = isType(csn)
                ? clean
                : this.resolver.inflect({csn, plainName: clean}).singular
            return !ns || ns.isCwd(file.path.asDirectory())
                ? ident
                : `${ns.asIdentifier()}.${ident}`
        }
        // remove the ancestry of projections/ views.
        // They explicitly define their properties.
        // But at the same time they also carry their .includes clause, which can
        // clash when the user aliases a selected property with the name of
        // a properties of the entities they project on:
        // entity foo as SELECT bar.baz AS ID FROM bar
        // will produce an error if bar also has a property ID which now clashes with foo.ID
        // WARNING: annotations from entities without properties should actually be propagated this way!
        // So once we start caring about annotations, we have to revisit this part.
        /** @type {import('./typedefs').resolver.EntityInfo[]} */
        const ancestorInfos = ((!isViewOrProjection(entity) ? entity.includes : []) ?? [])
            .map(ancestor => {
                const info = this.entityRepository.getByFq(ancestor)
                if (!info) throw new Error(`could not resolve ancestor ${ancestor} for ${fq}`)
                file.addImport(info.namespace)
                return info
            })

        const ancestorsAspects = ancestorInfos
            .reverse() // reverse so that own aspect A is applied before extensions B,C: B(C(A(Entity)))
            .reduce((wrapped, ancestor) => `${asIdentifier({info: ancestor, wrapper: name => `_${name}Aspect`, relative: file.path})}(${wrapped})`, 'Base')

        this.contexts.push({ entity: fq })

        // CLASS ASPECT
        buffer.addIndentedBlock(`export function ${identAspect(clean)}<TBase extends new (...args: any[]) => object>(Base: TBase) {`, () => {
            buffer.addIndentedBlock(`return class ${clean} extends ${ancestorsAspects} {`, () => {
                /** @type {import('./typedefs').resolver.EnumCSN[]} */
                const enums = []
                for (let [ename, element] of Object.entries(entity.elements ?? {})) {
                    if (element.target && /\.texts?/.test(element.target)) {
                        LOG.warn(`referring to .texts property in ${fq}. This is currently not supported and will be ignored.`)
                        continue
                    }
                    this.visitElement(ename, element, file, buffer)

                    // make foreign keys explicit
                    if (element.target) {
                        // lookup in cds.definitions can fail for inline structs.
                        // We don't really have to care for this case, as keys from such structs are _not_ propagated to
                        // the containing entity.
                        for (const [kname, originalKeyElement] of this.#keys(element.target)) {
                            if (getMaxCardinality(element) === 1 && typeof element.on !== 'object') {  // FIXME: kelement?
                                const foreignKey = `${ename}_${kname}`
                                if (entity.elements && Object.hasOwn(entity.elements, foreignKey)) {
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

                if ('kind' in entity) {
                    buffer.addIndented([`static readonly kind: 'entity' | 'type' | 'aspect' = '${entity.kind}';`])
                }

                buffer.addIndented(() => {
                    for (const e of enums) {
                        const eDoc = docify(e.doc)
                        eDoc.forEach(d => { buffer.add(d) })
                        buffer.add(`static ${e.name} = ${propertyToInlineEnumName(clean, e.name)}`)
                        file.addInlineEnum(clean, fq, e.name, csnToEnumPairs(e, {unwrapVals: true}), eDoc)
                    }
                    this.#printStaticActions(entity, buffer, ancestorInfos, file)
                    this.#printStaticKeys(buffer, clean)

                })
            }, '};') // end of generated class
        }, '}') // end of aspect

        // CLASS WITH ADDED ASPECTS
        file.addImport(baseDefinitions.path)
        docify(entity.doc).forEach(d => { buffer.add(d) })
        buffer.add(`export class ${identSingular(clean)} extends ${identAspect(toLocalIdent({clean, fq}))}(${baseDefinitions.path.asIdentifier()}.Entity) {${this.#staticClassContents(clean, entity).join('\n')}}`)
        this.contexts.pop()
    }

    /**
     * @param {string} clean - the clean name of the entity
     * @param {EntityCSN} entity - the entity to generate the static contents for
     */
    #staticClassContents(clean, entity) {
        return isDraftEnabled(entity) ? [`static drafts: typeof ${clean}`] : []
    }

    /**
     * @param {string} fq - fully qualified name of the entity
     * @param {EntityCSN} entity - the entity to print
     */
    #printEntity(fq, entity) {
        // static .name has to be defined more forcefully: https://github.com/microsoft/TypeScript/issues/442
        /**
         * @param {string} clazz - the class to override the name property for
         * @param {string} content - the content to set the name property to
         */
        const overrideNameProperty = (clazz, content) => `Object.defineProperty(${clazz}, 'name', { value: '${content}' })`
        const { namespace: ns, entityName: clean, inflection } = this.entityRepository.getByFqOrThrow(fq)
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
            docify(entity.doc).forEach(d => { buffer.add(d) })
            buffer.add(`export class ${plural} extends Array<${singular}> {${additionalProperties.join('\n')}}`)
            buffer.add(overrideNameProperty(plural, entity.name))
        }
        buffer.add('')
    }

    /**
     * Stringifies function parameters in preparation of passing them to {@link SourceFile.stringifyLambda}.
     * Resolves all parameters to a pair of parameter name and name of the resolved type.
     * Also filters out parameters that indicate a binding parameter ({@link https://cap.cloud.sap/docs/releases/jan23#simplified-syntax-for-binding-parameters}).
     * @param {{[key:string]: EntityCSN}} params - parameter list as found in CSN.
     * @param {SourceFile} file - source file relative to which the parameter types should be resolved.
     * @returns {import('./typedefs').visitor.ParamInfo[]} tuple of name, modifier, type and doc.
     */
    #stringifyFunctionParams(params, file) {
        return Object.entries(params ?? {})
            // filter params of type '[many] $self', as they are not to be part of the implementation
            .filter(([, type]) => type?.type !== '$self' && type.items?.type !== '$self')
            .map(([name, type]) => ({
                name,
                modifier: this.resolver.isOptional(type) ? '?' : '',
                type: this.#stringifyFunctionParamType(type, file),
                doc: docify(type.doc).join('\n'),
            }))
    }

    /**
     * @param {EntityCSN | EnumCSN} type - type
     * @param {SourceFile} file - the file to resolve types into
     */
    #stringifyFunctionParamType(type, file) {
        // if type.type is not 'cds.String', 'cds.Integer', ..., then we are actually looking
        // at a named enum type. In that case also resolve that type name
        const isNamedEnumType = isEnum(type) && this.resolver.builtinResolver.resolveBuiltin(type.type)
        if (isNamedEnumType) return stringifyEnumType(csnToEnumPairs(type))
        const paramType = this.resolver.resolveAndRequire(type, file)
        return this.inlineDeclarationResolver.getPropertyDatatype(
            paramType,
            paramType.typeInfo.isArray || paramType.typeInfo.isDeepRequire
                ? paramType.typeName
                : paramType.typeInfo.inflection.singular
        )
    }

    /**
     * @param {string} fq - fully qualified name of the operation
     * @param {import('./typedefs').resolver.OperationCSN} operation - CSN
     * @param {'function' | 'action'} kind - kind of operation
     */
    #printOperation(fq, operation, kind) {
        LOG.debug(`Printing operation ${fq}:\n${JSON.stringify(operation, null, 2)}`)
        const { namespace } = this.entityRepository.getByFqOrThrow(fq)
        const file = this.fileRepository.getNamespaceFile(namespace)
        const params = this.#stringifyFunctionParams(operation.params, file)
        const returnType = operation.returns
            ? this.resolver.resolveAndRequire(operation.returns, file)
            : { typeName: 'void', typeInfo: { plainName: 'void', isArray: false, inflection: { singular: 'void', plural: 'void' } } }
        let returns = this.inlineDeclarationResolver.getPropertyDatatype(
            returnType,
            returnType.typeInfo.isArray
                ? returnType.typeName
                : returnType.typeInfo.inflection.singular
        )
        if (operation.returns) {
            // operation results may be a Promise
            returns = createUnionOf(createPromiseOf(returns), returns)
        }
        // Actions for ABAP RFC modules have 'parameter categories' (import/export/changing/tables) that cannot be called in a flat order.
        // Prevent positional call style there.
        // TODO find a better way to detect ABAP RFC actions
        const isRFC = Object.values(operation.params ?? {}).some(p => Object.keys(p).some(k => k.startsWith('@RFC')))
        file.addOperation(last(fq), params, returns, kind, docify(operation.doc), {named: true, positional: !isRFC})
    }

    /**
     * @param {string} fq - fully qualified name of the type
     * @param {EntityCSN} type - CSN
     */
    #printType(fq, type) {
        LOG.debug(`Printing type ${fq}:\n${JSON.stringify(type, null, 2)}`)
        const { namespace, entityName } = this.entityRepository.getByFqOrThrow(fq)
        const file = this.fileRepository.getNamespaceFile(namespace)
        // skip references to enums.
        // "Base" enums will always have a builtin type (don't skip those).
        // A type referencing an enum E will be considered an enum itself and have .type === E (skip).
        if (isEnum(type) && !isReferenceType(type) && this.resolver.builtinResolver.resolveBuiltin(type.type)) {
            file.addEnum(fq, entityName, csnToEnumPairs(type), docify(type.doc))
        } else {
            const isEnumReference = typeof type.type === 'string' && isEnum(this.csn.inferred.definitions[type?.type])
            // alias
            file.addType(fq, entityName, this.resolver.resolveAndRequire(type, file).typeName, isEnumReference)
        }
        // TODO: annotations not handled yet
    }

    /**
     * @param {string} fq - fully qualified name of the aspect
     * @param {EntityCSN} aspect - CSN
     */
    #printAspect(fq, aspect) {
        LOG.debug(`Printing aspect ${fq}`)
        const { namespace, entityName, inflection } = this.entityRepository.getByFqOrThrow(fq)
        const file = this.fileRepository.getNamespaceFile(namespace)
        // aspects are technically classes and can therefore be added to the list of defined classes.
        // Still, when using them as mixins for a class, they need to already be defined.
        // So we separate them into another buffer which is printed before the classes.
        file.addClass(entityName, fq)
        file.aspects.add(`// the following represents the CDS aspect '${entityName}'`)
        this.#aspectify(fq, aspect, file.aspects, { cleanName: inflection.singular })
    }

    /**
     * @param {string} fq - fully qualified name of the event
     * @param {EntityCSN} event - CSN
     */
    #printEvent(fq, event) {
        const { namespace, entityName } = this.entityRepository.getByFqOrThrow(fq)
        const file = this.fileRepository.getNamespaceFile(namespace)
        file.addEvent(entityName, fq)
        const buffer = file.events.buffer
        buffer.add('// event')
        // only declare classes, as their properties are not optional, so we don't have to do awkward initialisation thereof.
        buffer.addIndentedBlock(`export declare class ${entityName} {`, () => {
            const propOpt = configuration.propertiesOptional
            // FIXME: shouldn't need to change config here! Idea: init Visitor with .options fed from config, then manipulate that
            configuration.propertiesOptional = false
            for (const [ename, element] of Object.entries(event.elements ?? {})) {
                this.visitElement(ename, element, file, buffer)
            }
            configuration.propertiesOptional = propOpt
        }, '}')
    }

    /**
     * @param {string} fq - fully qualified name of the service
     * @param {import('./typedefs').resolver.EntityCSN} service - CSN
     */
    #printService(fq, service) {
        LOG.debug(`Printing service ${fq}:\n${JSON.stringify(service, null, 2)}`)
        const { namespace } = this.entityRepository.getByFqOrThrow(fq)
        const file = this.fileRepository.getNamespaceFile(namespace)
        const buffer = file.services.buffer
        const serviceNameSimple = service.name.split('.').pop()

        docify(service.doc).forEach(d => { buffer.add(d) })
        // file.addImport(new Path(['cds'], '')) TODO make sap/cds import work
        buffer.addIndentedBlock(`export class ${serviceNameSimple} extends cds.Service {`, () => {
            Object.entries(service.operations ?? {}).forEach(([name, {doc}]) => {
                docify(doc).forEach(d => { buffer.add(d) })
                buffer.add(`declare ${name}: typeof ${name}`)
            })
        }, '}')
        buffer.add(`export default ${serviceNameSimple}`)
        buffer.add('')
        file.addService(service.name)
    }

    /**
     * Visits a single entity from the CSN's definition field.
     * Will call #printEntity or #printAction based on the entity's kind.
     * @param {string} fq - name of the entity, fully qualified as is used in the definition field.
     * @param {EntityCSN} entity - CSN data belonging to the entity to perform lookups in.
     */
    visitEntity(fq, entity) {
        switch (entity.kind) {
        case 'entity':
            this.#printEntity(fq, entity)
            break
        case 'action':
        case 'function':
            // @ts-expect-error - we know entity is actually an OperationCSN
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
     * @param {EntityCSN} element - CSN data belonging to the the element.
     * @param {SourceFile} file - the namespace file the surrounding entity is being printed into.
     * @param {Buffer} [buffer] - buffer to add the definition to. If no buffer is passed, the passed file's class buffer is used instead.
     * @returns @see InlineDeclarationResolver.visitElement
     */
    visitElement(name, element, file, buffer = file.classes) {
        return this.inlineDeclarationResolver.visitElement({
            name,
            element,
            file,
            buffer,
            // we explicitly pass the "declare" modifier here to avoid problems with noImplicitOverride and useDefineForClassFields in strict tsconfigs
            // but not inside type defs (e.g. parameter types) where this would be a syntax error
            modifiers: getPropertyModifiers(element)
        })
    }
}

module.exports = {
    Visitor
}

