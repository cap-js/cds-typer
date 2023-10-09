'use strict'

const fs = require('fs').promises
const path = require('path')
const cds2ts = require('../../lib/compile')
const { ASTWrapper } = require('../ast')
const { locations } = require('../util')

const dir = locations.testOutput('enums_test')

// FIXME: missing: inline enums (entity Foo { bar: String enum { ... }})

describe('Enum Types', () => {
    let ast

    beforeEach(async () => await fs.unlink(dir).catch(err => {}))
    beforeAll(async () => {
        const paths = await cds2ts
            .compileFromFile(locations.unit.files('enums/model.cds'), { outputDirectory: dir, inlineDeclarations: 'structured' })
        ast = new ASTWrapper(path.join(paths[1], 'index.ts'))
    })

    describe('Static Enum Property', () => {
        test('Wrapper Present', async () => {
            expect(ast.getAspects().find(({name, members}) => name === '_InlineEnumAspect'
                && members?.find(member => member.name === 'elements' && member.modifiers?.find(m => m.keyword === 'static')))
            ).toBeTruthy()
        })
    })

    describe('Anonymous', () => {
        describe('String Enum', () => {
            test('Definition Present', async () => 
                expect(ast.tree.find(n => n.name === 'InlineEnum_gender' 
                && n.initializer.expression.female.val === 'female'
                && n.initializer.expression.male.val === 'male'
                && n.initializer.expression.non_binary.val === 'non-binary'))
                .toBeTruthy())

            test('Referring Property', async () =>
                expect(ast.getAspects().find(({name, members}) => name === '_InlineEnumAspect'
                && members?.find(member => member.name === 'gender' && member.type?.full === 'InlineEnum_gender')))
                .toBeTruthy())

        })

        describe('Int Enum', () => {
            test('Definition Present', async () => 
                expect(ast.tree.find(n => n.name === 'InlineEnum_status' 
                && n.initializer.expression.submitted.val === 1
                && n.initializer.expression.fulfilled.val === 2
                && n.initializer.expression.canceled.val === -1
                && n.initializer.expression.shipped.val === 42))
                .toBeTruthy())

            test('Referring Property', async () =>
                expect(ast.getAspects().find(({name, members}) => name === '_InlineEnumAspect'
                && members?.find(member => member.name === 'status' && member.type?.full === 'InlineEnum_status')))
                .toBeTruthy())
        })

        describe('Mixed Enum', () => {
            test('Definition Present', async () =>
                expect(ast.tree.find(n => n.name === 'InlineEnum_yesno'
                && n.initializer.expression.catchall.val === 42
                && n.initializer.expression.no.val === false
                && n.initializer.expression.yes.val === true
                && n.initializer.expression.yesnt.val === false))
                .toBeTruthy())

            test('Referring Property', async () =>
                expect(ast.getAspects().find(({name, members}) => name === '_InlineEnumAspect'
                && members?.find(member => member.name === 'yesno' && member.type?.full === 'InlineEnum_yesno')))
                .toBeTruthy())
        })
    })

    describe('Named', () => {
        describe('String Enum', () => {
            test('Values', async () =>
                expect(ast.tree.find(n => n.name === 'Gender' 
                && n.initializer.expression.female === 'female'
                && n.initializer.expression.male === 'male'
                && n.initializer.expression.non_binary === 'non-binary'))
                .toBeTruthy())

            test('Type Alias', async () =>
                expect(ast.getTypeAliasDeclarations().find(n => n.name === 'Gender'
                && ['male', 'female', 'non-binary'].every(t => n.types.includes(t))))
                .toBeTruthy())
        })

        describe('Int Enum', () => {
            test('Values', async () =>
                expect(ast.tree.find(n => n.name === 'Status' 
                && n.initializer.expression.submitted === 1
                && n.initializer.expression.unknown === 0
                && n.initializer.expression.cancelled === -1))
                .toBeTruthy())

            test('Type Alias', async () =>
                expect(ast.getTypeAliasDeclarations().find(n => n.name === 'Status'
                && [-1, 0, 1].every(t => n.types.includes(t))))
                .toBeTruthy())
        })

        describe('Mixed Enum', () => {
            test('Values', async () =>
                ast.tree.find(n => n.name === 'Truthy' 
                && n.yes === true
                && n.no === false
                && n.yesnt === false
                && n.catchall === 42))

            test('Type Alias', async () =>
                expect(ast.getTypeAliasDeclarations().find(n => n.name === 'Truthy'
                && [true, false, 42].every(t => n.types.includes(t))))
                .toBeTruthy())
        })
    })
})