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

    test('string enums values', async () => {
        expect(ast.tree.find(n => n.name === 'Gender' 
        && n.initializer.female === 'female'
        && n.initializer.male === 'male'
        && n.initializer.non_binary === 'non-binary'))
        .toBeTruthy()
    })

    test('string enums type alias', async () => {
        expect(ast.getTypeAliasDeclarations().find(n => n.name === 'Gender'
        && ['male', 'female', 'non-binary'].every(t => n.types.includes(t))))
        .toBeTruthy()
    })

    test('int enums values', async () => {
        expect(ast.tree.find(n => n.name === 'Status' 
        && n.initializer.submitted === 1
        && n.initializer.unknown === 0
        && n.initializer.cancelled === -1))
        .toBeTruthy()
    })

    test('int enums type alias', async () => {
        expect(ast.getTypeAliasDeclarations().find(n => n.name === 'Status'
        && [-1, 0, 1].every(t => n.types.includes(t))))
        .toBeTruthy()
    })

    test('mixed enums values', async () => {
        ast.tree.find(n => n.name === 'Truthy' 
        && n.yes === true
        && n.no === false
        && n.yesnt === false
        && n.catchall === 42
    )})

    test('mixed enums type alias', async () => {
        expect(ast.getTypeAliasDeclarations().find(n => n.name === 'Truthy'
        && [true, false, 42].every(t => n.types.includes(t))))
        .toBeTruthy()
    })
})