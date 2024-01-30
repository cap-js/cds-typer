'use strict'

const fs = require('fs').promises
const path = require('path')
const cds2ts = require('../../lib/compile')
const { ASTWrapper, check, JSASTWrapper, checkFunction } = require('../ast')
const { locations } = require('../util')

const dir = locations.testOutput('enums_test')

// FIXME: missing: inline enums (entity Foo { bar: String enum { ... }})
describe('Enum Action Parameters', () => {
    let astw

    beforeEach(async () => await fs.unlink(dir).catch(() => {}))
    beforeAll(async () => {
        const paths = await cds2ts
            .compileFromFile(locations.unit.files('enums/actions.cds'), { outputDirectory: dir, inlineDeclarations: 'structured' })
        astw = new ASTWrapper(path.join(paths[1], 'index.ts'))
    })
    
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

    beforeEach(async () => await fs.unlink(dir).catch(() => {}))
    beforeAll(async () => {
        const paths = await cds2ts
            .compileFromFile(locations.unit.files('enums/nested.cds'), { outputDirectory: dir, inlineDeclarations: 'structured' })
        astw = await JSASTWrapper.initialise(path.join(paths[1], 'index.js'))
    })

    test('Coalescing Assignment Present', () => {
        const stmts = astw.programm.body
        const enm = stmts.find(n => n.type === 'ExpressionStatement' && n.expression.type === 'AssignmentExpression' && n.expression.operator === '??=')
        expect(enm).toBeTruthy()
        const { left } = enm.expression
        // not checking the entire object chain here...
        expect(left.property.name).toBe('someEnumProperty')
    }) 
})


describe('Enum Types', () => {
    let astw

    beforeEach(async () => await fs.unlink(dir).catch(() => {}))
    beforeAll(async () => {
        const paths = await cds2ts
            .compileFromFile(locations.unit.files('enums/model.cds'), { outputDirectory: dir, inlineDeclarations: 'structured' })
        astw = new ASTWrapper(path.join(paths[1], 'index.ts'))
    })

    describe('Anonymous', () => {
        describe('Within type Definition', () => {
            // FIXME: this is for now the expected behaviour, but it should be possible to
            //       resolve the type to the actual enum definition
            test('Coalesces to cds.String', () => {
                astw.tree
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