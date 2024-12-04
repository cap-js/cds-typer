'use strict'

const path = require('path')
const { beforeAll, describe, test, expect } = require('@jest/globals')
const { check, JSASTWrapper, checkFunction, ASTWrapper } = require('../ast')
const { locations, prepareUnitTest } = require('../util')

// FIXME: missing: inline enums (entity Foo { bar: String enum { ... }})
describe('Enum Action Parameters', () => {
    let astw

    beforeAll(async () => astw = (await prepareUnitTest('enums/actions.cds', locations.testOutput('enums_test'))).astw)

    test('Coalescing Assignment Present', () => {
        const actions = astw.getAspectProperty('_FoobarAspect', 'actions')
        checkFunction(actions.type.members.find(fn => fn.name === 'f'), {
            parameterCheck: ({members: [fst]}) => fst.name === 'p'
                && check.isUnionType(fst.type, [
                    t => check.isLiteral(t, 'A'),
                    t => check.isLiteral(t, 'b'),
                ])
        })
    })

    test('External Enum Definition Parameter', () => {
        const actions = astw.getAspectProperty('_FoobarAspect', 'actions')
        checkFunction(actions.type.members.find(fn => fn.name === 'g'), {
            parameterCheck: ({members: [fst]}) => fst.name === 'p'
                && check.isNullable(fst.type, [t => check.isTypeReference(t, 'EnumFoo')])
        })
    })
})


describe('Nested Enums', () => {
    let astw

    beforeAll(async () => {
        const paths = (await prepareUnitTest('enums/nested.cds', locations.testOutput('enums_test'))).paths
        astw = await JSASTWrapper.initialise(path.join(paths[1], 'index.js'))
    })

    test('Coalescing Assignment Present', () => {
        const stmts = astw.program.body
        const enm = stmts.find(n => n.type === 'ExpressionStatement' && n.expression.type === 'AssignmentExpression' && n.expression.operator === '??=')
        expect(enm).toBeTruthy()
        const { left } = enm.expression
        // not checking the entire object chain here...
        expect(left.property.name).toBe('someEnumProperty')
    })
})


describe('Enum Types', () => {
    let astw

    beforeAll(async () => astw = (await prepareUnitTest('enums/model.cds', locations.testOutput('enums_test'))).astw)

    describe('Anonymous', () => {
        describe('Within type Definition', () => {
            test('Property References Artificially Named Enum', () => {
                astw.exists(
                    '_TypeWithInlineEnumAspect',
                    'inlineEnumProperty',
                    p => check.isNullable(p.type, [t => check.isTypeReference(t, 'TypeWithInlineEnum_inlineEnumProperty')])
                )
            })
        })

        describe('String Enum', () => {
            test('Definition Present', async () =>
                expect(astw.tree.find(n => n.name === 'InlineEnum_gender'
                && n.initializer.expression.female === 'female'
                && n.initializer.expression.male === 'male'
                && n.initializer.expression.non_binary === 'non-binary'))
                    .toBeTruthy())

            test('Referring Property', async () =>
                expect(astw.getAspects().find(({name, members}) => name === '_InlineEnumAspect'
                && members?.find(member => member.name === 'gender' && check.isNullable(member.type, [t => t?.full === 'InlineEnum_gender']))))
                    .toBeTruthy())

        })

        describe('Int Enum', () => {
            test('Definition Present', async () =>
                expect(astw.tree.find(n => n.name === 'InlineEnum_status'
                && n.initializer.expression.submitted === 1
                && n.initializer.expression.fulfilled === 2
                && n.initializer.expression.canceled === -1
                && n.initializer.expression.shipped === 42))
                    .toBeTruthy())

            test('Referring Property', async () =>
                expect(astw.getAspects().find(({name, members}) => name === '_InlineEnumAspect'
                && members?.find(member => member.name === 'status' && check.isNullable(member.type, [t => t?.full === 'InlineEnum_status']))))
                    .toBeTruthy())
        })

        describe('Mixed Enum', () => {
            test('Definition Present', async () =>
                expect(astw.tree.find(n => n.name === 'InlineEnum_yesno'
                && n.initializer.expression.catchall === 42
                && n.initializer.expression.no === false
                && n.initializer.expression.yes === true
                && n.initializer.expression.yesnt === false))
                    .toBeTruthy())

            test('Referring Property', async () =>
                expect(astw.getAspects().find(({name, members}) => name === '_InlineEnumAspect'
                && members?.find(member => member.name === 'yesno' &&  check.isNullable(member.type, [t => t?.full === 'InlineEnum_yesno']))))
                    .toBeTruthy())
        })
    })

    describe('Named', () => {
        describe('String Enum', () => {
            test('Values', async () =>
                expect(astw.tree.find(n => n.name === 'Gender'
                && n.initializer.expression.female === 'female'
                && n.initializer.expression.male === 'male'
                && n.initializer.expression.non_binary === 'non-binary'))
                    .toBeTruthy())

            test('Type Alias', async () =>
                expect(astw.getTypeAliasDeclarations().find(n => n.name === 'Gender'
                && ['male', 'female', 'non-binary'].every(t => n.types.includes(t))))
                    .toBeTruthy())
        })

        describe('Int Enum', () => {
            test('Values', async () =>
                expect(astw.tree.find(n => n.name === 'Status'
                && n.initializer.expression.submitted === 1
                && n.initializer.expression.unknown === 0
                && n.initializer.expression.cancelled === -1))
                    .toBeTruthy())

            test('Type Alias', async () =>
                expect(astw.getTypeAliasDeclarations().find(n => n.name === 'Status'
                && [-1, 0, 1].every(t => n.types.includes(t))))
                    .toBeTruthy())
        })

        describe('Mixed Enum', () => {
            test('Values', async () =>
                astw.tree.find(n => n.name === 'Truthy'
                && n.yes === true
                && n.no === false
                && n.yesnt === false
                && n.catchall === 42))

            test('Type Alias', async () =>
                expect(astw.getTypeAliasDeclarations().find(n => n.name === 'Truthy'
                && [true, false, 42].every(t => n.types.includes(t))))
                    .toBeTruthy())
        })
    })
})

describe('Imported Enums', () => {
    let paths

    beforeAll(async () => paths = (await prepareUnitTest('enums/importing/service.cds', locations.testOutput('enums_test'))).paths)

    test('Is Type Alias and Constant in Service', () => {
        const service = new ASTWrapper(path.join(paths[1], 'index.ts')).tree
        const decls = service.filter(n => n.name === 'EnumExample')
        expect(decls.some(check.isTypeAliasDeclaration)).toBe(true)
        expect(decls.some(check.isVariableDeclaration)).toBe(true)
    })

    test('Is Enum Declaration in Schema', () => {
        const schema = new ASTWrapper(path.join(paths[2], 'index.ts')).tree
        const enumExampleNodes = schema.filter(n => n.name === 'EnumExample')
        expect(enumExampleNodes.length).toBe(2)
        expect(enumExampleNodes.find(n => n.nodeType === 'variableStatement')).toBeTruthy()
        expect(enumExampleNodes.find(n => n.nodeType === 'typeAliasDeclaration')).toBeTruthy()
    })
})

describe('Enums of typeof', () => {
    /* FIXME: these should actually be inline-defined enums of the referenced type with explicit values
     * ```cds
     * entity X { y: String };
     * type T: X:y { a }  // should produce a string enum with value `a`
     * ```
     * but as a first step, they'll be just a value of the referenced type
     */
    let astw

    beforeAll(async () => {
        const paths = (await prepareUnitTest('enums/enumtyperef.cds', locations.testOutput('enums_test'))).paths
        astw = new ASTWrapper(path.join(paths[2], 'index.ts'))
    })

    test('Enum References in Parameters', () => {
        // FIXME: returntypecheck currently broken: cds-typer can currently only deal with refs
        // that contain exactly one element. Type refs are of guise { ref: ['n.A', 'p'] }
        // so right now the property type reference is incorrectly resolved to n.A
        checkFunction(astw.tree.find(node => node.name === 'EnumInParamAndReturn'), {
            //returnTypeCheck: type =>  check.isNullable(type, [check.isIndexedAccessType]),
            parameterCheck: ({members: [fst]}) => check.isNullable(fst.type, [check.isIndexedAccessType])
        })
    })
})