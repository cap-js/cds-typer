/**
 * We read the generated .ts files using the official
 * Typescript AST parser. Said AST is (naturally) extremely verbose
 * and contains all kinds of information we don't use and is a bit tricky to deal with.
 * So we do an initial run over the AST to create a slimmed-down tree that is more wieldable
 * for our unit tests. We only cover the parts of TS which we actually utilise in our generated files.
 * That means, the resulting AST is highly specialised for TS elements that are emitted
 * by the type generator -- if the output of the generator changes, the AST has to be adjusted accordingly.
 */
const fs = require('fs/promises')
const ts = require('typescript')
const acorn = require('acorn')

const kinds = {
    TypeReference: 'typeReference',
    ClassDeclaration: 'classDeclaration',
    ClassExpression: 'classExpression',
    FunctionDeclaration: 'functionDeclaration',
    ImportDeclaration: 'importDeclaration',
    PropertyDeclaration: 'propertyDeclaration',
    PropertySignature: 'propertSignature',
    Keyword: 'keyword',
    VariableStatement: 'variableStatement',
    TypeAliasDeclaration: 'typeAliasDeclaration',
    ModuleDeclaration: 'moduleDeclaration',
    CallExpression: 'callExpression'
}

/**
 *
 * @param {any} node - the node to check
 */
function isKeyword(node) {
    return !!ts.SyntaxKind[node.kind]
}

/**
 *
 * @param {any} node - the node to resolve relevant properties from
 */
function resolveKeyword(node) {
    // the TS AST packs a lot of information into keyword tokens, depending on their
    // actual keyword. We therefore try to resolve all the interesting fields
    // and then delete the ones that have not been filled in.
    return Object.fromEntries(Object.entries({
        keyword: ts.SyntaxKind[node.kind]?.replace('Keyword', '').toLowerCase(),
        nodeType: kinds.Keyword,
        name: visit(node.name),
        type: visit(node.type),                // only in propertysignature
        subtypes: node.types?.map(visit),      // only in intersectiontypes/ uniontypes
        elementType: visit(node.elementType),  // only in arraytypes
        members: node.members?.map(visit),     // only in inline type definitions
        indexType: visit(node.indexType),      // only in indexedaccesstype
        literal: visit(node.literal),          // only in literaltype
        expression: visit(node.expression)     // only in asexpression ("as const")
    }).filter(([,v]) => v !== undefined))
}

const visitors = [
    // order in some cases important. For example,
    // ts.isStatement will be true for ImportDeclarations etc.
    // so it has to be added after more specific checks.
    [ts.isModuleDeclaration, visitModuleDeclaration],
    [ts.isObjectLiteralExpression, visitObjectLiteralExpression],
    [ts.isCallExpression, visitCallExpression],
    [ts.isClassDeclaration, visitClassDeclaration],
    [ts.isFunctionDeclaration, visitFunctionDeclaration],
    [ts.isVariableStatement, visitVariableStatement],
    [ts.isBlock, visitBlock],
    [ts.isClassExpression, visitClassExpression],
    [ts.isPropertyDeclaration, visitPropertyDeclaration],
    [ts.isPropertySignature, visitPropertySignature],
    [ts.isTypeReferenceNode, visitTypeReference],
    [ts.isStringLiteral, visitStringLiteral],
    [ts.isHeritageClause, visitHeritageClause],
    [ts.isIdentifier, visitIdentifier],
    [ts.isImportClause, visitImportClause],
    [ts.isImportDeclaration, visitImportDeclaration],
    [ts.isTypeAliasDeclaration, visitTypeAliasDeclaration],
    [ts.isPrefixUnaryExpression, visitPrefixUnaryExpression],
    [ts.isStatement, visitStatement],
    [n => [ts.SyntaxKind.TrueKeyword, ts.SyntaxKind.FalseKeyword].includes(n.kind), visitBooleanLiteral],
    [n => n.kind === ts.SyntaxKind.NumericLiteral, visitNumericLiteral],
    [isKeyword, resolveKeyword],
    // eslint-disable-next-line no-console
    [() => true, node => console.error(`unhandled node type: ${JSON.stringify(node, null, 2)}`)]
]

/**
 * @param {ts.CallExpression} node - the node to visit
 */
function visitCallExpression(node) {
    return {
        nodeType: kinds.CallExpression,
        expression: visit(node.expression),
        arguments: node.arguments.map(visit)
    }
}

/**
 * @typedef {{name: string, body: any[]}} ModuleDeclaration
 * @param {ts.ModuleDeclaration} node - the node to visit
 * @returns {ModuleDeclaration}
 */
function visitModuleDeclaration(node) {
    return {
        nodeType: kinds.ModuleDeclaration,
        name: visit(node.name),
        body: node.body.statements.map(visit)
    }
}

/**
 * @typedef {{name: string, type: any[]}} TypeAliasDeclaration
 * @param {ts.TypeAliasDeclaration} node - the node to visit
 * @returns {TypeAliasDeclaration}
 */
function visitTypeAliasDeclaration(node) {
    return {
        nodeType: kinds.TypeAliasDeclaration,
        name: visit(node.name),
        // FIXME: sometimes also has .members
        types: (node.type.types ?? []).map(visit).map(t => t.literal)
    }
}

/** @param { {text: string} } node - the node to visit */
function visitNumericLiteral(node) {
    return Number(node.text)
}

/** @param {ts.Token} node - the node to visit */
function visitBooleanLiteral(node) {
    // the literals "true" and "false" are very non-descriptive,
    // so we directly check for their kind to find them
    if (node.kind === ts.SyntaxKind.TrueKeyword) return true
    if (node.kind === ts.SyntaxKind.FalseKeyword) return false
}

/** @param { {operator: number, operand: {}} } node - the node to visit */
function visitPrefixUnaryExpression(node) {
    if (node.operator === ts.SyntaxKind.MinusToken) return -visit(node.operand)
}

/** @param {ts.ObjectLiteralExpression} node - the node to visit */
function visitObjectLiteralExpression(node) {
    return node.properties.reduce((o, {name, initializer}) => {
        o[visit(name)] = visit(initializer)
        return o
    }, {})
}

/** @param {ts.Identifier} node - the node to visit */
function visitIdentifier(node) {
    return node.escapedText
}

/** @param {ts.StringLiteral} node - the node to visit */
function visitStringLiteral(node) {
    return node.text
}

/**
 * @typedef {{}} HeritageClause
 * @param {ts.HeritageClause} node - the node to visit
 * @returns {HeritageClause}
 */
function visitHeritageClause(node) {
    return {
        types: node.types.map(visit)
    }
}

/**
 * @typedef {{name: string, type?: any, initializer?: any, nodeType: string}} VariableStatement
 * @param {ts.VariableStatement} node - the node to visit
 * @returns {VariableStatement}
 */
function visitVariableStatement(node) {
    return node.declarationList.declarations.map(vd => ({
        name: visit(vd.name),
        type: visit(vd.type),
        initializer: visit(vd.initializer),
        nodeType: kinds.VariableStatement
    }))
}

/**
 * @typedef {{module: any, as: string, nodeType: string}} ImportDeclaration
 * @param {ts.ImportDeclaration} node - the node to visit
 * @returns {ImportDeclaration}
 */
function visitImportDeclaration(node) {
    const { as } = visitImportClause(node.importClause)
    const module = visit(node.moduleSpecifier)
    return { module, as, nodeType: kinds.ImportDeclaration }
}

/**
 * @typedef {{as: string}} ImportClause
 * @param {ts.ImportClause} node - the node to visit
 * @returns {ImportClause}
 */
function visitImportClause(node) {
    // we're only using namedBindings so far
    const as = visit(node.namedBindings?.name)
    return { as }
}

/**
 * @typedef {{namespace: string, name: string, full: string, args: any[], nodeType: string}} TypeReference
 * @param {ts.TypeReference} node - the node to visit
 * @returns {TypeReference}
 */
function visitTypeReference(node) {
    const namespace = node.typeName.left ? visit(node.typeName.left) : ''
    const name = node.typeName.right ? visit(node.typeName.right) : visit(node.typeName)
    const full = namespace ? `${namespace}.${name}` : name
    const args = node.typeArguments?.map(visit)
    return { namespace, name, full, args, nodeType: kinds.TypeReference }
}

/**
 * @typedef {{name: string, type: any, optional: boolean, nodeType: string, modifiers: object, initializer?: object}} PropertyDeclaration
 * @param {ts.PropertyDeclaration} node - the node to visit
 * @returns {PropertyDeclaration}
 */
function visitPropertyDeclaration(node) {
    const name = visit(node.name)
    const type = visit(node.type)
    const optional = !!node.questionToken
    const modifiers = node.modifiers?.map(visit) ?? []
    const initializer = visit(node.initializer)
    return { name, type, optional, nodeType: kinds.PropertyDeclaration, modifiers, initializer }
}

/**
 * @typedef {{name: string, type: any, optional: boolean, nodeType: string, modifiers: object}} PropertySignature
 * @param {ts.PropertySignature} node - the node to visit
 * @returns {PropertySignature}
 */
function visitPropertySignature(node) {
    const name = visit(node.name)
    const type = visit(node.type)
    const optional = !!node.questionToken
    const modifiers = node.modifiers?.map(visit) ?? []
    return { name, type, optional, nodeType: kinds.PropertySignature, modifiers }
}

/**
 * @typedef {{name: string, members: PropertyDeclaration[], nodeType: string}} ClassExpression
 * @param {ts.ClassExpression} node - the node to visit
 * @returns {ClassExpression}
 */
function visitClassExpression(node) {
    const name = visit(node.name)
    const members = node.members.map(visit)
    const heritage = node.heritageClauses?.map(visit) ?? []
    return { name, members, nodeType: kinds.ClassExpression, heritage }
}

/** @param {ts.Statement} node - the node to visit */
function visitStatement(node) {
    return node.forEachChild(visit)
}

/** @param {ts.Block} node - the node to visit */
function visitBlock(node) {
    return node.statements.map(visit)
}

/**
 * @typedef {{name: string, typeParameters: any[], heritage: [], members: [], type: string}} ClassDeclaration
 * @param {ts.ClassDeclaration} node - the node to visit
 * @returns {ClassDeclaration}
 */
function visitClassDeclaration(node) {
    const name = visit(node.name)
    const heritage = node.heritageClauses?.map(visit) ?? []
    const members = node.members.map(visit)
    const typeParameters = node.typeParameters?.map(visit) ?? []
    return { name, typeParameters, heritage, members, nodeType: kinds.ClassDeclaration }
}

/**
 * @typedef {{name: string, body: any[], nodeType: string}} FunctionDeclaration
 * @param {ts.FunctionDeclaration} node - the node to visit
 * @returns {FunctionDeclaration}
 */
function visitFunctionDeclaration(node) {
    const name = node.name.text
    const body = visit(node.body)
    return { name, body, nodeType: kinds.FunctionDeclaration }
}

/** @param {ts.Node} node - the node that was unsuccessfully handled */
function errorHandler(node) {
    // eslint-disable-next-line no-console
    console.error(`unhandled node type ${node.kind}`)
}

/** @param {ts.Node} node - the node to visit */
function visit(node) {
    if (!node) return
    const [,handler] = visitors.find(([cond,]) => cond(node)) ?? [null, errorHandler]
    return handler(node)
}

class ASTWrapper {
    constructor(file) {
        const program = ts.createProgram([file], { allowJs: true })
        const sourceFile = program.getSourceFile(file)
        this.tree = []
        sourceFile.forEachChild(c => {
            const slim = visit(c)
            // ignore top-level keywords, like 'export', etc.
            if (slim && slim?.nodeType !== kinds.Keyword) {
                this.tree.push(slim)
            }
        })
        this.tree = this.tree.flat() // flatten out variable statements
    }

    /** @returns {ImportDeclaration[]} */
    getImports() {
        return this.tree.filter(n => n.nodeType === kinds.ImportDeclaration)
    }

    /** @returns {FunctionDeclaration[]} */
    getAspectFunctions() {
        return this.tree.filter(n => n.nodeType === kinds.FunctionDeclaration
            && n.body.length === 1
            && n.body[0].nodeType === kinds.ClassExpression)
    }

    /** @returns {ClassDeclaration[]} */
    getTopLevelClassDeclarations() {
        return this.tree
            .filter(n => n.nodeType === kinds.ClassDeclaration)
    }

    /** @returns {TypeAliasDeclaration[]} */
    getTypeAliasDeclarations() {
        return this.tree
            .filter(n => n.nodeType === kinds.TypeAliasDeclaration)
    }

    /** @returns {ModuleDeclaration[]} */
    getModuleDeclarations() {
        return this.tree
            .filter(n => n.nodeType === kinds.ModuleDeclaration)
    }

    /**
     * @param {string} name - the name of the module to find
     * @returns {ModuleDeclaration | undefined}
     */
    getModuleDeclaration(name) {
        return this.getModuleDeclarations().find(m => m.name === name)
    }

    // /** @returns {ClassDeclaration[]} */
    // getSingularClassDeclarations() {
    //     return this.getTopLevelClassDeclarations()
    //         .filter(n => n.heritage?.at(0)?.subtypes?.at(0)?.keyword === keywords.ExpressionWithTypeArguments)
    // }

    // /** @returns {ClassDeclaration[]} */
    // getPluralClassDeclarations() {
    //     return this.getTopLevelClassDeclarations()
    //         .filter(n => n.heritage?.at(0)?.subtypes?.at(0)?.keyword === keywords.ExpressionWithTypeArguments)
    // }

    /** @returns {ClassDeclaration[]} */
    getInlineClassDeclarations() {
        // this is total bogus, as its the same as getAspects...
        return this.tree
            .filter(n => n.nodeType === kinds.FunctionDeclaration)
            .map(fn => ({...fn.body[0], name: fn.name }))
    }

    /** @returns {ClassExpression[]} */
    getAspects() {
        return this.getAspectFunctions().map(({name, body}) => ({...body[0], name}))
    }

    getAspect(name) {
        return this.getAspects().find(c => c.name === name)
    }

    getAspectProperty(name, property) {
        return this.getAspect(name).members.find(m => m.name === property)
    }

    /** @returns {VariableStatement[]} */
    getEntities() {
        return this.tree.filter(n => n.nodeType === kinds.VariableStatement)
    }

    exists(clazz, property, type, typeArg) {
        const entities = this.getInlineClassDeclarations().concat(this.getAspects())
        const clz = entities.find(c => c.name === clazz)
        if (!clz) throw Error(`no class with name ${clazz}`)
        if (!property) return true

        const prop = clz.members.find(m => m.name === property)
        if (!prop) throw Error(`class ${clazz} does not feature a property ${property}`)
        if (!type) return true

        if (typeof type === 'function') {
            if (!type(prop)) throw Error(`${clazz}.${property} is not of expected type ${type} (it is actually of type ${JSON.stringify(prop.type)}) (f)`)
        } else if (prop.type.name !== type && prop.type.keyword !== type) throw Error(`${clazz}.${property} is not of expected type ${type} (it is actually of type ${prop.type.name})`)
        if (!typeArg) return true

        if (prop.type.args[0].name !== typeArg) throw Error(`type of ${type} in ${clazz}.${property} does not have the expected type parameter ${typeArg} (it is actually of type ${prop.type.args[0].name})`)
        return true
    }
}

class JSASTWrapper {
    static async initialise(file, proxyExports = false) {
        return new JSASTWrapper(await fs.readFile(file, 'utf-8'), proxyExports)
    }

    constructor(code, proxyExports) {
        this.proxyExports = proxyExports
        this.program = acorn.parse(code, { ecmaVersion: 'latest'})
    }

    exportsAre(expected) {
        if (expected.length < this.getExports().length) throw new Error(`there are more actual than expected exports. Expected ${expected.length}, found ${this.getExports().length}`)
        for (const [lhs, rhs] of expected) {
            if (!this.hasExport(lhs, rhs)) throw new Error(`missing export module.exports.${lhs} = ${rhs}`)
        }
    }

    hasCdsEntitiesAccess() {
        this.program.body.filter(node => {
            if (node.type !== 'VariableDeclaration') return false
            if (node.declarations[0].id !== 'csn') return false
            return node.declarations[0].init?.callee.object.name === 'cds'
                && node.declarations[0].init?.callee.property.name === 'entities'
        }).length > 0
    }

    hasProxyExport(name, customProps) {
        const proxyExport = this.getExports().find(exp => exp.lhs === name && exp.proxyArgs?.length)
        if (!proxyExport) throw new Error(`missing module.exports for entities proxy with name ${name}`)
        if (proxyExport.proxyArgs.length !== 2) throw new Error('proxy function called without additional options')

        const property = proxyExport.proxyArgs[1].properties[1]
        if (property?.key?.name !== 'customProps') throw new Error('customProps not found in proxy call arguments')

        const propKeys = property.value.elements.map(e => e.value)
        if (!customProps.every(c => propKeys.includes(c))) throw new Error('not all expected custom props found in argument')
    }

    hasExport(lhs, rhs) {
        return this.getExports().find(exp => exp.lhs === lhs && (exp.rhs === rhs || exp.rhs.name === rhs))
    }

    /**
     * @returns {{ lhs: string, rhs: string | { singular: boolean, name: string }}}
     */
    getExports() {
        const processObjectLiteral = ({properties}) => ({
            singular: properties.find(p => p.key.name === 'is_singular' && p.value.value),
            name: properties.find(p => p.key.name === '__proto__')?.value.property.name
        })
        return this.exports ??= this.program.body.filter(node => {
            if (node.type !== 'ExpressionStatement') return false
            if (node.expression.left.type !== 'MemberExpression') return false
            const { object, property } = node.expression.left.object
            return object.name === 'module' && property.name === 'exports'
        }).map(node => {
            return {
                lhs: node.expression.left.property.name,
                rhs: this.proxyExports
                    ? node.expression.right.arguments?.[0].elements[1].value
                    : node.expression.right.property?.name ?? processObjectLiteral(node.expression.right),
                proxyArgs: node.expression.right.arguments
            }
        })
    }
}

const checkFunction = (fnNode, {callCheck, parameterCheck, returnTypeCheck, modifiersCheck}) => {
    if (!fnNode) throw new Error('the function does not exist (or was not properly accessed from the AST)')
    const [callsignature1, callsignature2, parameters, returnType] = fnNode?.type?.members ?? []
    if (!callsignature1 || callsignature1.keyword !== 'callsignature') throw new Error('callsignature1 is not present or of wrong type')
    if (!callsignature2 || callsignature2.keyword !== 'callsignature') throw new Error('callsignature2 is not present or of wrong type')
    if (!parameters || ts.unescapeLeadingUnderscores(parameters.name) !== '__parameters') throw new Error('__parameters property is missing or named incorrectly')
    if (!returnType || ts.unescapeLeadingUnderscores(returnType.name) !== '__returns') throw new Error('__returns property is missing or named incorrectly')

    if (callCheck && !callCheck(callsignature1.type)) throw new Error('callsignature is not matching expectations')
    if (callCheck && !callCheck(callsignature2.type)) throw new Error('callsignature is not matching expectations')
    if (parameterCheck && !parameterCheck(parameters.type)) throw new Error('parameter type is not matching expectations')
    if (returnTypeCheck && !returnTypeCheck(returnType.type)) throw new Error('return type is not matching expectations')
    if (modifiersCheck && !modifiersCheck(fnNode?.modifiers)) throw new Error('modifiers did not meet expectations')

    return true
}

const checkKeyword = (node, expected) => node?.keyword === expected
const checkNodeType = (node, expected) => node?.nodeType === expected

const check = {
    isString: node => checkKeyword(node, 'string'),
    isNumber: node => checkKeyword(node, 'number'),
    isBoolean: node => checkKeyword(node, 'boolean'),
    /**
     * @param {any} node - the node to check
     * @param {[(args: object[]) => boolean]} of - the predicates to check against
     */
    isArray: (node, of = undefined) => node?.full === 'Array' && (!of || of(node.args)),
    isAny: node => checkKeyword(node, 'any'),
    isVoid: node => checkKeyword(node, 'void'),
    isStatic: node => checkKeyword(node, 'static'),
    isStaticMember: node => node?.modifiers?.find(m => checkKeyword(m, 'static')),
    isReadonlyMember: node => node?.modifiers?.find(m => checkKeyword(m, 'readonly')),
    isIndexedAccessType: node => checkKeyword(node, 'indexedaccesstype'),
    isParenthesizedType: (node, of = undefined) => checkKeyword(node, 'parenthesizedtype') && (of === undefined || of(node.type)),
    isNull: node => checkKeyword(node, 'literaltype') && checkKeyword(node.literal, 'null'),
    isUnionType: (node, of = []) => checkKeyword(node, 'uniontype')
        && of.reduce((acc, predicate) => acc && node.subtypes.some(st => predicate(st)), true),
    isIntersectionType: (node, of = []) => checkKeyword(node, 'intersectiontype')
        && of.reduce((acc, predicate) => acc && node.subtypes.some(st => predicate(st)), true),
    isNullable: (node, of = []) => check.isUnionType(node, of.concat([check.isNull])),
    isOptional: node => node.optional,
    hasDeclareModifier: node => node?.modifiers?.some(mod => checkKeyword(mod, 'declare')),
    isLiteral: (node, literal = undefined) => checkKeyword(node, 'literaltype') && (literal === undefined || node.literal === literal),
    isTypeReference: (node, full = undefined) => checkNodeType(node, 'typeReference') && (!full || node.full === full),
    isTypeQuery: node => checkKeyword(node, 'typequery'),  // FIXME: should actually check what is being queried
    isTypeAliasDeclaration: node => checkNodeType(node, 'typeAliasDeclaration'),
    isVariableDeclaration: node => checkNodeType(node, 'variableStatement'),
    isCallExpression: (node, expression) => checkNodeType(node, 'callExpression') && (!expression || node.expression === expression),
    isPropertyAccessExpression: (node, expression, name) => checkKeyword(node, 'propertyaccessexpression') && (!expression || node.expression === expression) && (!name || node.name === name),
    isKeyOf: (n, template)  => check.isTypeReference(n, '___.Key') && template(n.args[0]) // special __.Key<X> type
}

/**
 * @param {object} node - the node to check (class definition)
 * @param {string[]} ancestors - fully qualified names of ancestors
 * @returns {boolean} - true iff node extends all ancestors
 */
const checkInheritance = (node, ancestors) => {
    /**
     *
     * @param {string} fq - fully qualified name to check for
     * @param {any} node - the node to check
     */
    function checkPropertyAccessExpression (fq, node) {
        if (check.isPropertyAccessExpression(node)) {
            const [from, property] = fq.split('.')
            if (check.isPropertyAccessExpression(node, from, property)) return true
            if (inherits(fq, node.arguments)) return true
        }
        return false
    }

    /**
     *
     * @param {string} name - the name of the ancestor to check
     * @param {object[]} [ancestor] - the ancestors to check against
     */
    function inherits (name, [ancestor] = []) {
        if (!ancestor) return false
        // A: B, C, D
        if (check.isCallExpression(ancestor)) {
            if (check.isCallExpression(ancestor, name)) return true
            if (inherits(name, ancestor.arguments)) return true
            // A: _.B, _.C, _.D
            const isPropertyAccess = checkPropertyAccessExpression(name, ancestor.expression)
            if (isPropertyAccess) return isPropertyAccess
        }
        // Entity (innermost)
        return checkPropertyAccessExpression(name, ancestor)
    }
    const ancestry = [node.heritage[0].types[0].expression]
    return ancestors.reduce((acc, ancestor) => acc && inherits(ancestor, ancestry), true)
}


module.exports = {
    ASTWrapper,
    JSASTWrapper,
    checkFunction,
    checkInheritance,
    checkKeyword,
    check: check
}
