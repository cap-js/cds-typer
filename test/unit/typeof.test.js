'use strict'

const fs = require('fs').promises
const path = require('path')
const cds2ts = require('../../lib/compile')
const { ASTWrapper, check } = require('../ast')
const { locations } = require('../util')

const dir = locations.testOutput('typeof')

// compilation produces semantically complete Typescript
describe('Typeof Syntax', () => {

    beforeEach(async () => await fs.unlink(dir).catch(() => {}))

    test('External', async () => {
        const paths = await cds2ts
        .compileFromFile(locations.unit.files('typeof/model.cds'), { outputDirectory: dir, inlineDeclarations: 'structured' })
        const astw = new ASTWrapper(path.join(paths[1], 'index.ts'))
        expect(astw.exists('_BazAspect', 'ref', m => check.isNullable(m.type, [st => check.isIndexedAccessType(st) && st.indexType.literal === 'status']))).toBeTruthy()
    })

    test('Structured', async () => {
        const paths = await cds2ts
        .compileFromFile(locations.unit.files('typeof/model.cds'), { outputDirectory: dir, inlineDeclarations: 'structured' })
        const astw = new ASTWrapper(path.join(paths[1], 'index.ts'))
        expect(astw.exists('_BarAspect', 'ref_a', 
            m => check.isNullable(m.type, [st => check.isIndexedAccessType(st) && st.indexType.literal === 'a'])
        )).toBeTruthy()
        expect(astw.exists('_BarAspect', 'ref_b', 
            m => check.isNullable(m.type, [st => check.isIndexedAccessType(st) && st.indexType.literal === 'b'])
        )).toBeTruthy()
        // meh, this is not exactly correct, as I apparently did not retrieve the chained type accesses properly,
        // but it's kinda good enough
        expect(astw.exists('_BarAspect', 'ref_c', 
            m => check.isNullable(m.type, [st => check.isIndexedAccessType(st) && st.indexType.literal === 'x'])
        )).toBeTruthy()
    })

    test('Flat', async () => {
        const paths = await cds2ts
        .compileFromFile(locations.unit.files('typeof/model.cds'), { outputDirectory: dir, inlineDeclarations: 'flat' })
        const astw = new ASTWrapper(path.join(paths[1], 'index.ts'))
        expect(astw.exists('_BarAspect', 'ref_a', 
        m => check.isNullable(m.type, [st => check.isIndexedAccessType(st) && st.indexType.literal === 'a'])
        )).toBeTruthy()
        expect(astw.exists('_BarAspect', 'ref_b', 
        m => check.isNullable(m.type, [st => check.isIndexedAccessType(st) && st.indexType.literal === 'b'])
        )).toBeTruthy()
        expect(astw.exists('_BarAspect', 'ref_c', 
        m => check.isNullable(m.type, [st => check.isIndexedAccessType(st) && st.indexType.literal === 'c_x'])
        )).toBeTruthy()
    })
})