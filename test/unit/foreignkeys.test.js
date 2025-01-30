'use strict'

const { before, describe, it } = require('node:test')
const assert = require('assert')
const { locations, prepareUnitTest } = require('../util')
const { check } = require('../ast')

describe('Foreign Keys', () => {
    let astw
    before(async () => {
        astw = (await prepareUnitTest('foreignkeys/model.cds', locations.testOutput('foreign_keys'))).astw
    })

    it('should verify keys one level deep', async () => {
        assert.ok(astw.exists('_BAspect', 'c_ID', ({type}) => check.isKeyOf(type, check.isString)))
        assert.ok(astw.exists('_BAspect', 'd_ID', ({type}) => check.isKeyOf(type, check.isString)))
        assert.ok(astw.exists('_CAspect', 'e_ID', ({type}) => check.isKeyOf(type, check.isString)))
    })

    it('should verify keys two levels deep', async () => {
        assert.ok(astw.exists('_AAspect', 'b_c_ID', ({type}) => check.isKeyOf(type, check.isString)))
        assert.ok(astw.exists('_AAspect', 'b_d_ID', ({type}) => check.isKeyOf(type, check.isString)))
        assert.ok(astw.exists('_BAspect', 'c_e_ID', ({type}) => check.isKeyOf(type, check.isString)))
    })

    it('should verify keys three levels deep', async () => {
        assert.ok(astw.exists('_AAspect', 'b_c_e_ID', ({type}) => check.isKeyOf(type, check.isString)))
    })
})