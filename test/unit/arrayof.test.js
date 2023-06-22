'use strict'

const fs = require('fs').promises
const path = require('path')
const cds2ts = require('../../lib/compile')
const { ASTWrapper } = require('../ast')
const { locations } = require('../util')

const dir = locations.testOutput('arrayof_test')


describe('array of', () => {
    let ast

    beforeEach(async () => await fs.unlink(dir).catch(err => {}))
    beforeAll(async () => {
        const paths = await cds2ts
            .compileFromFile(locations.unit.files('arrayof/model.cds'), { outputDirectory: dir, inlineDeclarations: 'structured' })
            // eslint-disable-next-line no-console
            .catch((err) => console.error(err))
        ast = new ASTWrapper(path.join(paths[1], 'index.ts'))
    })

    test('String', async () => {
        const paths = await cds2ts
            .compileFromFile(locations.unit.files('arrayof/model.cds'), { outputDirectory: dir, inlineDeclarations: 'structured' })
            // eslint-disable-next-line no-console
            .catch((err) => console.error(err))
        //const ast = new ASTWrapper(path.join(paths[1], 'index.ts'))
    })

    test('Local Type', async () => {
        const fn = ast.tree[0]
        /*
        expect(fn.nodeType).toBe('variableStatement')
        expect(fn.name).toBe('f1')
        const res = fn.type.type
        expect(res.members.length).toBe(1)
        // FIXME: what do they look like with arrays?
        expect(res.members[0].name).toBe('a')
        expect(res.members[1].name).toBe('b')
        */
    })

    test('Imported Type', async () => {
        const paths = await cds2ts
            .compileFromFile(locations.unit.files('arrayof/model.cds'), { outputDirectory: dir, inlineDeclarations: 'structured' })
            // eslint-disable-next-line no-console
            .catch((err) => console.error(err))
        const ast = new ASTWrapper(path.join(paths[1], 'index.ts'))
    })

    test('Inline Struct', async () => {
        const paths = await cds2ts
            .compileFromFile(locations.unit.files('arrayof/model.cds'), { outputDirectory: dir, inlineDeclarations: 'structured' })
            // eslint-disable-next-line no-console
            .catch((err) => console.error(err))
        const ast = new ASTWrapper(path.join(paths[2], 'index.ts'))
    })

})