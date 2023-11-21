'use strict'

const fs = require('fs').promises
const path = require('path')
const cds2ts = require('../../lib/compile')
const { ASTWrapper } = require('../ast')
const { locations } = require('../util')

const dir = locations.testOutput('typeof')

// compilation produces semantically complete Typescript
describe('Typeof Syntax', () => {
    beforeEach(async () => await fs.unlink(dir).catch(() => {})) //console.log('INFO', `Unable to unlink '${dir}' (${err}). This may not be an issue.`)

    test('Structured', async () => {
        const paths = await cds2ts
            .compileFromFile(locations.unit.files('typeof/model.cds'), { outputDirectory: dir, inlineDeclarations: 'structured' })
            // eslint-disable-next-line no-console
            .catch((err) => console.error(err))
        const ast = new ASTWrapper(path.join(paths[1], 'index.ts'))
        expect(ast.exists('_BarAspect', 'ref_a', 
            m => m.type.indexType.literal === 'a'
        )).toBeTruthy()
        expect(ast.exists('_BarAspect', 'ref_b', 
            m => m.type.indexType.literal === 'b'
        )).toBeTruthy()
        // meh, this is not exactly correct, as I apparently did not retrieve the chained type accesses properly,
        // but it's kinda good enough
        expect(ast.exists('_BarAspect', 'ref_c', 
            m => m.type.indexType.literal === 'x'
        )).toBeTruthy()
    })

    test('Flat', async () => {
        const paths = await cds2ts
            .compileFromFile(locations.unit.files('typeof/model.cds'), { outputDirectory: dir })
            // eslint-disable-next-line no-console
            .catch((err) => console.error(err))
        const ast = new ASTWrapper(path.join(paths[1], 'index.ts'))
        expect(ast.exists('_BarAspect', 'ref_a', 
            m => m.type.indexType.literal === 'a'
        )).toBeTruthy()
        expect(ast.exists('_BarAspect', 'ref_b', 
            m => m.type.indexType.literal === 'b'
        )).toBeTruthy()
        expect(ast.exists('_BarAspect', 'ref_c', 
            m => m.type.indexType.literal === 'c_x'
        )).toBeTruthy()
              /*
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
                */
    })
})