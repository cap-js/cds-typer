'use strict'

const fs = require('fs').promises
const path = require('path')
const cds2ts = require('../../lib/compile')
const { ASTWrapper, check } = require('../ast')
const { locations } = require('../util')

const dir = locations.testOutput('output/references')

// compilation produces semantically complete Typescript
describe('References', () => {
    beforeEach(async () => await fs.unlink(dir).catch(() => {})) //console.log('INFO', `Unable to unlink '${dir}' (${err}). This may not be an issue.`)

    test('Entity', async () => {
        const paths = await cds2ts
            .compileFromFile(locations.unit.files('references/model.cds'), { outputDirectory: dir, inlineDeclarations: 'structured' })
        const ast = new ASTWrapper(path.join(paths[1], 'index.ts'))
        expect(ast.exists('_BarAspect', 'assoc_one', m => check.isNullable(m.type, [
                ({name, args}) => name === 'to' && args[0].name === 'Foo'
        ]))).toBeTruthy()
        expect(ast.exists('_BarAspect', 'assoc_many', m => true
                && m.type.name === 'many'
                && m.type.args[0].name === 'Foo_'
        )).toBeTruthy()
        expect(ast.exists('_BarAspect', 'comp_one', m => check.isNullable(m.type, [
                ({name, args}) => name === 'of' && args[0].name === 'Foo'
        ]))).toBeTruthy()
        expect(ast.exists('_BarAspect', 'comp_many', m => true
                && m.type.name === 'many'
                && m.type.args[0].name === 'Foo_'
        )).toBeTruthy()
        expect(ast.exists('_BarAspect', 'assoc_one_first_key', m => check.isNullable(m.type, [check.isString]))).toBeTruthy()
        expect(ast.exists('_BarAspect', 'assoc_one_second_key', m => check.isNullable(m.type, [check.isString]))).toBeTruthy()
        expect(ast.exists('_BarAspect', 'assoc_one_ID', m => check.isNullable(m.type, [check.isString]))).toBeTruthy()
    })

    test('Inline', async () => {
        const paths = await cds2ts
            .compileFromFile(locations.unit.files('references/model.cds'), { outputDirectory: dir, inlineDeclarations: 'structured' })
            // eslint-disable-next-line no-console
            .catch((err) => console.error(err))
        const ast = new ASTWrapper(path.join(paths[1], 'index.ts'))
        expect(ast.exists('_BarAspect', 'inl_comp_one', m => {
                const comp = m.type.subtypes[0]
                const [a] = comp.args[0].members
                return check.isNullable(m.type)
                        && comp.name === 'of'
                        && a.name === 'a'
                        && check.isNullable(a.type, [check.isString])
        })).toBeTruthy()
        expect(ast.exists('_BarAspect', 'inl_comp_many', m => {
                const [arr] = m.type.args
                return m.type.name === 'many'
                && arr.name === 'Array'
                && arr.args[0].members[0].name === 'a'
                && check.isNullable(arr.args[0].members[0].type, [check.isString])
        })).toBeTruthy()
        // inline ID is not propagated into the parent entity
        expect(() => ast.exists('_BarAspect', 'inl_comp_one_ID')).toThrow(Error)
    })
})