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
    Keyword: 'keyword',
    VariableStatement: 'variableStatement',
    TypeAliasDeclaration: 'typeAliasDeclaration',
    ModuleDeclaration: 'moduleDeclaration'
}

/*
const keywords = {
    ExpressionWithTypeArguments: 'expressionwithtypearguments',
    HeritageClause: 'heritageclause'
}
*/

function isKeyword(node) {
    return !!ts.SyntaxKind[node.kind]
}

function resolveKeyword(node) {
    // the TS AST packs a lot of information into keyword tokens, depending on their
    // actual keyword. We therefore try to resolve all the intersting fields
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
    [ts.isClassDeclaration, visitClassDeclaration],
    [ts.isFunctionDeclaration, visitFunctionDeclaration],
    [ts.isVariableStatement, visitVariableStatement],
    [ts.isBlock, visitBlock],
    [ts.isClassExpression, visitClassExpression],
    [ts.isPropertyDeclaration, visitPropertyDeclaration],
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
    [() => true, node => console.error(`unhandled node type: ${JSON.stringify(node, null, 2)}`)]
]

/**
 * @typedef {{name: string, body: any[]}} ModuleDeclaration
 * @param node {ts.ModuleDeclaration}
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
 * @param node {ts.TypeAliasDeclaration}
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

/** @param node { {text: string} } */
function visitNumericLiteral(node) {
    return Number(node.text)
}

/** @param node {ts.Token} */
function visitBooleanLiteral(node) {
    // the literals "true" and "false" are very non-descriptive,
    // so we directly check for their kind to find them
    if (node.kind === ts.SyntaxKind.TrueKeyword) return true
    if (node.kind === ts.SyntaxKind.FalseKeyword) return false
}

/** @param node { {operator: number, operand: {}} } */
function visitPrefixUnaryExpression(node) {
    if (node.operator === ts.SyntaxKind.MinusToken) return -visit(node.operand)
}

/** @param node {ts.ObjectLiteralExpression} */
function visitObjectLiteralExpression(node) {
    return node.properties.reduce((o, {name, initializer}) => {
        o[visit(name)] = visit(initializer)
        return o
    }, {})
}

/** @param node {ts.Identifier} */
function visitIdentifier(node) {
    return node.escapedText
} 

/** @param node {ts.StringLiteral} */
function visitStringLiteral(node) {
    return node.text
}

/** 
 * @typedef {{}} HeritageClause
 * @param node {ts.HeritageClause}
 * @returns {HeritageClause}
 */
function visitHeritageClause(node) {
    return {
        types: node.types.map(visit)
    }
}

/**
 * @typedef {{name: string, type?: any, initializer?: any, nodeType: string}} VariableStatement
 * @param node {ts.VariableStatement} 
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
 * @param node {ts.ImportDeclaration}
 * @returns {ImportDeclaration}
 */
function visitImportDeclaration(node) {
    const { as } = visitImportClause(node.importClause)
    const module = visit(node.moduleSpecifier)
    return { module, as, nodeType: kinds.ImportDeclaration }
}

/** 
 * @typedef {{as: string}} ImportClause
 * @param node {ts.ImportClause} 
 * @returns {ImportClause}
 */
function visitImportClause(node) {
    // we're only using namedBindings so far
    const as = visit(node.namedBindings?.name)
    return { as }
}

/**
 * @typedef {{namespace: string, name: string, full: string, args: any[], nodeType: string}} TypeReference
 * @param node {ts.TypeReference} 
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
 * @typedef {{name: string, type: any, optional: boolean, nodeType: string, modifiers: object}} PropertyDeclaration
 * @param node {ts.PropertyDeclaration}
 * @returns {PropertyDeclaration}
 */
function visitPropertyDeclaration(node) {
    const name = visit(node.name)
    const type = visit(node.type)
    const optional = !!node.questionToken
    const modifiers = node.modifiers?.map(visit) ?? []
    return { name, type, optional, nodeType: kinds.PropertyDeclaration, modifiers }
}

/**
 * @typedef {{name: string, members: PropertyDeclaration[], nodeType: string}} ClassExpression
 * @param node {ts.ClassExpression} 
 * @returns {ClassExpression}
 */
function visitClassExpression(node) {
    const name = visit(node.name)
    const members = node.members.map(visit)
    return { name, members, nodeType: kinds.ClassExpression }
}

/** @param node {ts.Statement} */
function visitStatement(node) {
    return node.forEachChild(visit)
}

/** @param node {ts.Block} */
function visitBlock(node) {
    return node.statements.map(visit)
}

/**
 * @typedef {{name: string, typeParameters: any[], heritage: [], members: [], type: string}} ClassDeclaration
 * @param node {ts.ClassDeclaration} 
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
 * @param node {ts.FunctionDeclaration} 
 * @returns {FunctionDeclaration}
 */
function visitFunctionDeclaration(node) {
    const name = node.name.text
    const body = visit(node.body)
    return { name, body, nodeType: kinds.FunctionDeclaration }
}

/** @param node {ts.Node} */
function errorHandler(node) {
    console.error(`unhandled node type ${node.kind}`)
}

/** @param node {ts.Node} */
function visit(node) {
    if (!node) return
    const [,handler] = visitors.find(([cond,]) => cond(node)) ?? [null, errorHandler]
    return handler(node)
}

class ASTWrapper {
    constructor(file) {
        const program = ts.createProgram([file], { allowJs: true });
        const sourceFile = program.getSourceFile(file);
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

    /** @returns {ModuleDeclaration | undefined} */
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
    static async initialise(file) {
        return new JSASTWrapper(await fs.readFile(file, 'utf-8'))
    }

    constructor(code) {
        this.program = acorn.parse(code, { ecmaVersion: 'latest'})
    }

    exportsAre(expected) {
        if (expected.length < this.getExports().length) throw new Error(`there are more actual than expected exports. Expected ${expected.length}, found ${this.getExports().length}`)
        for (const [lhs, rhs] of expected) {
            if (!this.hasExport(lhs, rhs)) throw new Error(`missing export module.exports.${lhs} = ${rhs}`)
        }
    }

    hasExport(lhs, rhs) {
        return this.getExports().find(exp => exp.lhs === lhs && exp.rhs === rhs)
    }

    getExports() {
        return this.exports ??= this.program.body.filter(node => {
            if (node.type !== 'ExpressionStatement') return false
            if (node.expression.left.type !== 'MemberExpression') return false
            const { object, property } = node.expression.left.object
            return object.name === 'module' && property.name === 'exports'
        }).map(node => (
            {
                lhs: node.expression.left.property.name,
                rhs: node.expression.right.property.name
            }
        ))
    }
}

const checkFunction = (fnNode, {callCheck, parameterCheck, returnTypeCheck, modifiersCheck}) => {
    if (!fnNode) throw new Error('the function does not exist (or was not properly accessed from the AST)') 
    const [callsignature, parameters, returnType] = fnNode?.type?.members ?? []
    if (!callsignature || callsignature.keyword !== 'callsignature') throw new Error('callsignature is not present or of wrong type')
    if (!parameters || ts.unescapeLeadingUnderscores(parameters.name) !== '__parameters') throw new Error('__parameters property is missing or named incorrectly')
    if (!returnType || ts.unescapeLeadingUnderscores(returnType.name) !== '__returns') throw new Error('__returns property is missing or named incorrectly')

    if (callCheck && !callCheck(callsignature.type)) throw new Error('callsignature is not matching expectations')
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
    isAny: node => checkKeyword(node, 'any'),
    isStatic: node => checkKeyword(node, 'static'),
    isIndexedAccessType: node => checkKeyword(node, 'indexedaccesstype'),
    isNull: node => checkKeyword(node, 'literaltype') && checkKeyword(node.literal, 'null'),
    isUnionType: (node, of = []) => checkKeyword(node, 'uniontype') 
        && of.reduce((acc, predicate) => acc && node.subtypes.some(st => predicate(st)), true),
    isNullable: (node, of = []) => check.isUnionType(node, of.concat([check.isNull])),
    isLiteral: (node, literal = undefined) => checkKeyword(node, 'literaltype') && (literal === undefined || node.literal === literal),
    isTypeReference: (node, full) => checkNodeType(node, 'typeReference') && node.full === full,
    isTypeAliasDeclaration: node => checkNodeType(node, 'typeAliasDeclaration'),
}


module.exports = {
    ASTWrapper,
    JSASTWrapper,
    checkFunction,
    check: check
}
