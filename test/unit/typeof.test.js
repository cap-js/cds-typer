'use strict'

const { describe, it } = require('node:test')
const assert = require('assert')
const { check } = require('../ast')
const { locations, prepareUnitTest } = require('../util')

describe('Typeof Syntax Tests', () => {
    it('should verify external references', async () => {
        const astw = (await prepareUnitTest('typeof/model.cds', locations.testOutput('typeof_structured_external'))).astw
        assert.ok(astw.exists('_BazAspect', 'ref', m => check.isNullable(m.type, [st => check.isIndexedAccessType(st) && st.indexType.literal === 'status'])))
    })

    it('should verify deep required references', async () => {
        const astw = (await prepareUnitTest('typeof/deep.cds', locations.testOutput('typeof_deep'))).astw
        assert.ok(astw.exists('_UserRoleAspect', 'users',
            m => check.isTypeReference(m.type) && check.isTypeReference(m.type.args.at(0), 'Users.roles')
        ))
        assert.ok(astw.exists('_UserRoleGroupAspect', 'users',
            m => check.isNullable(m.type, [
                st => check.isTypeReference(st.args.at(0), 'Users.roleGroup')
            ])
        ))
    })

    it('should verify structured references', async () => {
        const astw = (await prepareUnitTest('typeof/model.cds', locations.testOutput('typeof_structured'))).astw
        assert.ok(astw.exists('_BarAspect', 'ref_a',
            m => check.isNullable(m.type, [st => check.isIndexedAccessType(st) && st.indexType.literal === 'a'])
        ))
        assert.ok(astw.exists('_BarAspect', 'ref_b',
            m => check.isNullable(m.type, [st => check.isIndexedAccessType(st) && st.indexType.literal === 'b'])
        ))
        // meh, this is not exactly correct, as I apparently did not retrieve the chained type accesses properly,
        // but it's kinda good enough
        assert.ok(astw.exists('_BarAspect', 'ref_c',
            m => check.isNullable(m.type, [st => check.isIndexedAccessType(st) && st.indexType.literal === 'x'])
        ))
    })

    it('should verify flat references', async () => {
        const astw = (await prepareUnitTest(
            'typeof/model.cds',
            locations.testOutput('typeof_flat'),
            { typerOptions: { inlineDeclarations: 'flat' } }
        )).astw
        assert.ok(astw.exists('_BarAspect', 'ref_a',
            m => check.isNullable(m.type, [st => check.isIndexedAccessType(st) && st.indexType.literal === 'a'])
        ))
        assert.ok(astw.exists('_BarAspect', 'ref_b',
            m => check.isNullable(m.type, [st => check.isIndexedAccessType(st) && st.indexType.literal === 'b'])
        ))
        assert.ok(astw.exists('_BarAspect', 'ref_c',
            m => check.isNullable(m.type, [st => check.isIndexedAccessType(st) && st.indexType.literal === 'c_x'])
        ))
    })
})