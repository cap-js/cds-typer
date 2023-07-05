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
            // eslint-disable-next-line no-console
            .catch((err) => console.error(err))
        ast = new ASTWrapper(path.join(paths[1], 'index.ts'))
    })

    test('string enums', async () => {
        expect(ast.tree.find(n => n.name === 'Gender' 
        && n.initializer['female'] === 'female'
        && n.initializer['male'] === 'male'
        && n.initializer['non_binary'] === 'non-binary'))
        .toBeTruthy()
    })

    test('int enums', async () => {
        expect(ast.tree.find(n => n.name === 'Status' 
        && n.initializer['submitted'] === 1
        && n.initializer['unknown'] === 0
        && n.initializer['cancelled'] === -1))
        .toBeTruthy()
    })

    test('mixed enums', async () => {
        ast.tree.find(n => n.name === 'Truthy' 
        && n['yes'] === true
        && n['no'] === false
        && n['yesnt'] === false
        && n['catchall'] === 42
    )})
})