'use strict'

const { before, describe, it } = require('node:test')
const assert = require('assert')
const { check } = require('../ast')
const { locations, prepareUnitTest } = require('../util')

describe('Projection Entities Tests', () => {
    let astw

    before(async () => astw = (await prepareUnitTest('projection/model.cds', locations.testOutput('projection_test'))).astw)

    it('should verify base entity presence', () => assert.ok(astw.exists('_FooAspect')))

    it('should verify view entity presence', () => assert.ok(astw.exists('_FooViewAspect')))

    it('should verify projection on view entity presence', () => assert.ok(astw.exists('_FooViewProjectionAspect')))

    it('should verify expected properties in view', () => {
        assert.ok(astw.exists('_FooViewAspect', 'removeMeNext', ({type}) => check.isNullable(type, [check.isNumber])))
        assert.ok(astw.exists('_FooViewAspect', 'retainMeOnceMore', ({type}) => check.isNullable(type, [check.isNumber])))
        assert.throws(() => astw.exists('_FooViewAspect', 'removeMe', ({type}) => check.isNullable(type, [check.isNumber])), Error)
        assert.throws(() => astw.exists('_FooViewAspect', 'retainMeOnce', ({type}) => check.isNullable(type, [check.isNumber])), Error)
        assert.throws(() => astw.exists('_FooViewAspect', 'retainMeTwice', ({type}) => check.isNullable(type, [check.isNumber])), Error)
    })

    it('should verify expected properties in projection', () => {
        assert.throws(() => astw.exists('_FooViewProjectionAspect', 'removeMe', ({type}) => check.isNullable(type, [check.isNumber])), Error)
        assert.throws(() => astw.exists('_FooViewProjectionAspect', 'retainMeOnce', ({type}) => check.isNullable(type, [check.isNumber])), Error)
        assert.throws(() => astw.exists('_FooViewProjectionAspect', 'retainMeTwice', ({type}) => check.isNullable(type, [check.isNumber])), Error)
        assert.throws(() => astw.exists('_FooViewProjectionAspect', 'removeMeNext', ({type}) => check.isNullable(type, [check.isNumber])), Error)
        assert.ok(astw.exists('_FooViewProjectionAspect', 'Retained', ({type}) => check.isNullable(type, [check.isNumber])))
    })

    it('should verify projection on inline property', () => {
        assert.ok(astw.exists('_BAspect', 'y', ({type}) => check.isNullable(type, [check.isString])))
        assert.throws(() => astw.exists('_BAspect', 'x', ({type}) => check.isNullable(type)), Error)
    })
})
