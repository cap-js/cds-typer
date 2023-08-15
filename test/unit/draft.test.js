'use strict'

const fs = require('fs').promises
const path = require('path')
const cds2ts = require('../../lib/compile')
const { ASTWrapper } = require('../ast')
const { locations } = require('../util')

const dir = locations.testOutput('draft_test')

// FIXME: need to parse the function args from the AST to test them
describe('@odata.draft.enabled', () => {
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

        const fn = ast.tree[2]
        expect(fn.nodeType).toBe('variableStatement')
        expect(fn.name).toBe('free')
        const res = fn.type.type
        expect(res.members.length).toBe(2)
        expect(res.members[0].name).toBe('a')
        expect(res.members[1].name).toBe('b')
    })

    test('Bound Returning External Type', async () => {
        const paths = await cds2ts
            .compileFromFile(locations.unit.files('actions/model.cds'), { outputDirectory: dir, inlineDeclarations: 'structured' })
            // eslint-disable-next-line no-console
            .catch((err) => console.error(err))
        const ast = new ASTWrapper(path.join(paths[1], 'index.ts'))
        expect(ast.exists('_EAspect', 'f', 
            m => m.type.keyword === 'functiontype'
            && m.type.type.keyword === 'any'
        )).toBeTruthy()

        expect(ast.exists('_EAspect', 'k', 
        m => m.type.keyword === 'functiontype'
        && m.type.type.full === '_elsewhere.ExternalType'
        )).toBeTruthy()

        expect(ast.exists('_EAspect', 'l', 
        m => m.type.keyword === 'functiontype'
        && m.type.type.full === '_.ExternalInRoot'
        )).toBeTruthy()   
    })

    test('Unbound Returning External Type', async () => {
        const paths = await cds2ts
            .compileFromFile(locations.unit.files('actions/model.cds'), { outputDirectory: dir, inlineDeclarations: 'structured' })
            // eslint-disable-next-line no-console
            .catch((err) => console.error(err))
        const ast = new ASTWrapper(path.join(paths[2], 'index.ts'))

        const fn = ast.tree[3]  // very classy with the index and such
        expect(fn.nodeType).toBe('variableStatement')
        expect(fn.name).toBe('free2')
        const res = fn.type.type
        expect(res.full).toBe('_elsewhere.ExternalType')

        const fn2 = ast.tree[4]  // very classy with the index and such
        expect(fn2.nodeType).toBe('variableStatement')
        expect(fn2.name).toBe('free3')
        const res2 = fn2.type.type
        expect(res2.full).toBe('_.ExternalInRoot')
    })

    test('Bound Expecting $self Arguments', async () => {
        const paths = await cds2ts
            .compileFromFile(locations.unit.files('actions/model.cds'), { outputDirectory: dir, inlineDeclarations: 'structured' })
            // eslint-disable-next-line no-console
            .catch((err) => console.error(err))
        const ast = new ASTWrapper(path.join(paths[1], 'index.ts'))
        expect(ast.exists('_EAspect', 's1', 
            m => m.type.keyword === 'functiontype'
        )).toBeTruthy()  
        expect(ast.exists('_EAspect', 'sn', 
            m => m.type.keyword === 'functiontype'
        )).toBeTruthy()  
    })

})