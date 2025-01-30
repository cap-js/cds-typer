'use strict'

const { before, describe, it } = require('node:test')
const assert = require('assert')
const { check } = require('../ast')
const { locations, prepareUnitTest } = require('../util')

describe('View Entities Tests', () => {
    let astw

    before(async () => astw = (await prepareUnitTest('views/model.cds', locations.testOutput('views_test'))).astw)

    it('should verify view entity presence', () => assert.ok(astw.exists('_FooViewAspect')))

    it('should verify expected properties are present', () => {
        assert.ok(astw.exists('_FooViewAspect', 'id', ({type}) => check.isNullable(type, [check.isNumber])))
        assert.ok(astw.exists('_FooViewAspect', 'code', ({type}) => check.isNullable(type, [check.isString])))
        // including alias
        assert.ok(astw.exists('_FooViewAspect', 'alias', ({type}) => check.isNullable(type, [check.isString])))
    })

    it('should verify unselected field is not present', () => {
        assert.throws(() => astw.exists('_FooViewAspect', 'flag', ({type}) => check.isNullable(type, [check.isString])), Error)
    })

    it('should verify combining * and explicit selection', () => {
        assert.ok(astw.exists('_FooView2Aspect', 'id', ({type}) => check.isNullable(type, [check.isNumber])))
        assert.ok(astw.exists('_FooView2Aspect', 'id2', ({type}) => check.isNullable(type, [check.isNumber])))
        assert.ok(astw.exists('_FooView2Aspect', 'code', ({type}) => check.isNullable(type, [check.isString])))
    })

    it('should verify view has no heritage', () => {
        assert.strictEqual(astw.tree.find(({name}) => name === '_BazViewAspect').heritage, undefined)
    })
})
