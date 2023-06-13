'use strict'

const fs = require('fs').promises
const path = require('path')
const cds2ts = require('../../lib/compile')
const { ASTWrapper } = require('../ast')
const { locations } = require('../util')

const dir = locations.testOutput('actions_test')

describe('Actions', () => {
    beforeEach(async () => await fs.unlink(dir).catch(err => {}))

    test('Bound', async () => {
        const paths = await cds2ts
            .compileFromFile(locations.unit.files('actions/model.cds'), { outputDirectory: dir, inlineDeclarations: 'structured' })
            // eslint-disable-next-line no-console
            .catch((err) => console.error(err))
        const ast = new ASTWrapper(path.join(paths[1], 'index.ts'))
        expect(ast.exists('_EAspect', 'f', 
            m => m.type.keyword === 'functiontype'
            && m.type.type.keyword === 'any'
        )).toBeTruthy()
        expect(ast.exists('_EAspect', 'g', 
        m => m.type.keyword === 'functiontype'
        && m.type.type.keyword === 'number'
        )).toBeTruthy()
    })

    test('Unbound', async () => {
        const paths = await cds2ts
            .compileFromFile(locations.unit.files('actions/model.cds'), { outputDirectory: dir, inlineDeclarations: 'structured' })
            // eslint-disable-next-line no-console
            .catch((err) => console.error(err))
        const ast = new ASTWrapper(path.join(paths[2], 'index.ts'))

        const fn = ast.tree[0]
        expect(fn.nodeType).toBe('variableStatement')
        expect(fn.name).toBe('free')
        const res = fn.type.type
        expect(res.members.length).toBe(2)
        expect(res.members[0].name).toBe('a')
        expect(res.members[1].name).toBe('b')
    })
})