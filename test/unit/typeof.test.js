'use strict'

const fs = require('fs').promises
const path = require('path')
const cds2ts = require('../../lib/compile')
const { ASTWrapper, check } = require('../ast')
const { locations } = require('../util')

const dir = locations.testOutput('typeof')

// compilation produces semantically complete Typescript
describe('Typeof Syntax', () => {
    let astw

    beforeEach(async () => await fs.unlink(dir).catch(() => {}))
    beforeAll(async () => {
        const paths = await cds2ts
            .compileFromFile(locations.unit.files('typeof/model.cds'), { outputDirectory: dir, inlineDeclarations: 'structured' })
        astw = new ASTWrapper(path.join(paths[1], 'index.ts'))
    })

    test('External', async () => {
        expect(astw.exists('_BazAspect', 'ref', m => check.isNullable(m.type, [st => check.isIndexedAccessType(st) && st.indexType.literal === 'status']))).toBeTruthy()
    })

    test('Structured', async () => {
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
        expect(astw.exists('_BarAspect', 'ref_a', 
        m => check.isNullable(m.type, [st => check.isIndexedAccessType(st) && st.indexType.literal === 'a'])
        )).toBeTruthy()
        expect(astw.exists('_BarAspect', 'ref_b', 
        m => check.isNullable(m.type, [st => check.isIndexedAccessType(st) && st.indexType.literal === 'b'])
        )).toBeTruthy()
        expect(astw.exists('_BarAspect', 'ref_c', 
        m => check.isNullable(m.type, [st => check.isIndexedAccessType(st) && st.indexType.literal === 'c_x'])
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