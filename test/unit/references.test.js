'use strict'

const fs = require('fs').promises
const path = require('path')
const cds2ts = require('../../lib/compile')
const { ASTWrapper } = require('../ast')
const { locations } = require('../util')

const dir = locations.unit.files('output/references')

// compilation produces semantically complete Typescript
describe('References', () => {
    beforeEach(async () => await fs.unlink(dir).catch(err => {})) //console.log('INFO', `Unable to unlink '${dir}' (${err}). This may not be an issue.`)

    test('Entity', async () => {
        const paths = await cds2ts
            .compileFromFile(locations.unit.files('references/model.cds'), { outputDirectory: dir, inlineDeclarations: 'structured' })
            // eslint-disable-next-line no-console
            .catch((err) => console.error(err))
        const ast = new ASTWrapper(path.join(paths[1], 'index.ts'))
        expect(ast.exists('_BarAspect', 'assoc_one', m => true
                && m.type.name === 'to'
                && m.type.args[0].name === 'Foo'
        )).toBeTruthy()
        expect(ast.exists('_BarAspect', 'assoc_many', m => true
                && m.type.name === 'many'
                && m.type.args[0].name === 'Foo_'
        )).toBeTruthy()
        expect(ast.exists('_BarAspect', 'comp_one', m => true
                && m.type.name === 'of'
                && m.type.args[0].name === 'Foo'
        )).toBeTruthy()
        expect(ast.exists('_BarAspect', 'comp_many', m => true
                && m.type.name === 'many'
                && m.type.args[0].name === 'Foo_'
        )).toBeTruthy()
    })

    test('Inline', async () => {
        const paths = await cds2ts
            .compileFromFile(locations.unit.files('references/model.cds'), { outputDirectory: dir, inlineDeclarations: 'structured' })
            // eslint-disable-next-line no-console
            .catch((err) => console.error(err))
        const ast = new ASTWrapper(path.join(paths[1], 'index.ts'))
        expect(ast.exists('_BarAspect', 'inl_comp_one', m => true
                && m.type.name === 'of'
                && m.type.args[0].members[0].name === 'a'
                && m.type.args[0].members[0].type.keyword === 'string'
        )).toBeTruthy()
        expect(ast.exists('_BarAspect', 'inl_comp_many', m => true
                && m.type.name === 'many'
                && m.type.args[0].name === 'Array'
                && m.type.args[0].args[0].members[0].name === 'a'
                && m.type.args[0].args[0].members[0].type.keyword === 'string'
        )).toBeTruthy()
    })
})