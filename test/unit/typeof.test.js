'use strict'

const { describe, test, expect } = require('@jest/globals')
const { check } = require('../ast')
const { locations, prepareUnitTest } = require('../util')

describe('Typeof Syntax', () => {
    test('External', async () => {
        const astw = (await prepareUnitTest('typeof/model.cds', locations.testOutput('typeof_structured_external'))).astw
        expect(astw.exists('_BazAspect', 'ref', m => check.isNullable(m.type, [st => check.isIndexedAccessType(st) && st.indexType.literal === 'status']))).toBeTruthy()
    })


    test('Deep Required', async () => {
        const astw = (await prepareUnitTest('typeof/deep.cds', locations.testOutput('typeof_deep'))).astw
        expect(astw.exists('_UserRoleAspect', 'users',
            m => check.isTypeReference(m.type) && check.isIndexedAccessType(m.type.args.at(0)) && check.isLiteral(m.type.args.at(0).indexType, 'roles')
        )).toBeTruthy()
        expect(astw.exists('_UserRoleGroupAspect', 'users',
            m => check.isNullable(m.type, [
                st => check.isTypeReference(st) && check.isIndexedAccessType(st.args[0]) && check.isLiteral(st.args[0].indexType, 'roleGroups')
            ]))).toBeTruthy()
    })

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
        const astw = (await prepareUnitTest(
            'typeof/model.cds',
            locations.testOutput('typeof_flat'),
            { typerOptions: { inlineDeclarations: 'flat' } }
        )).astw
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