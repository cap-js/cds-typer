'use strict'

const fs = require('fs').promises
const path = require('path')
const cds2ts = require('../../lib/compile')
const { ASTWrapper } = require('../ast')
const { locations } = require('../util')

const dir = locations.testOutput('inline_test')

// compilation produces semantically complete Typescript
describe('Inline Type Declarations', () => {
    beforeEach(async () => await fs.unlink(dir).catch(err => {})) //console.log('INFO', `Unable to unlink '${dir}' (${err}). This may not be an issue.`)

    test('Structured', async () => {
        const paths = await cds2ts
            .compileFromFile(locations.unit.files('inline/model.cds'), { outputDirectory: dir, inlineDeclarations: 'structured' })
            // eslint-disable-next-line no-console
            .catch((err) => console.error(err))
        const ast = new ASTWrapper(path.join(paths[1], 'index.ts'))
        expect(ast.exists('_BarAspect', 'x', 
            m => m.name === 'x'
                && m.type.members.length === 2
                && m.type.members[0].name === 'a'
                    && m.type.members[0].type.members.length === 2
                    && m.type.members[0].type.members[0].name === 'b'
                    && m.type.members[0].type.members[0].type.keyword === 'number'
                    && m.type.members[0].type.members[1].name === 'c'
                    && m.type.members[0].type.members[1].type.nodeType === 'typeReference'
                    && m.type.members[0].type.members[1].type.args[0].full === 'Foo'
                && m.type.members[1].name === 'y'
                    && m.type.members[1].type.keyword === 'string'
        )).toBeTruthy()
    })

    test('Flat', async () => {
        const paths = await cds2ts
            .compileFromFile(locations.unit.files('inline/model.cds'), { outputDirectory: dir, inlineDeclarations: 'flat' })
            // eslint-disable-next-line no-console
            .catch((err) => console.error(err))
        const ast = new ASTWrapper(path.join(paths[1], 'index.ts'))
        expect(ast.exists('_BarAspect', 'x_a_b', 'number')).toBeTruthy() 
        expect(ast.exists('_BarAspect', 'x_y', 'string')).toBeTruthy()
        expect(ast.exists('_BarAspect', 'x_a_c', m => m.name === 'x_a_c' 
            && m.type.args[0].full === 'Foo'
        )).toBeTruthy()
    })
})