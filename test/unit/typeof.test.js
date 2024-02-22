'use strict'

const { check } = require('../ast')
const { locations, prepareUnitTest } = require('../util')

describe('Typeof Syntax', () => {

    test('Structured', async () => {
        const astw = (await prepareUnitTest('typeof/model.cds', locations.testOutput('typeof_structured'))).astw
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
        const astw = (await prepareUnitTest('typeof/model.cds', locations.testOutput('typeof_flat'), { inlineDeclarations: 'flat' })).astw
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