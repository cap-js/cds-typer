'use strict'

const { check } = require('../ast')
const { locations, prepareUnitTest } = require('../util')

describe('Projection Entities', () => {
    let astw

    beforeAll(async () => astw = (await prepareUnitTest('projection/model.cds', locations.testOutput('projection_test'))).astw)


    test('Base Entity Present', () => expect(astw.exists('_FooAspect')).toBeTruthy())

    test('View Entity Present', () => expect(astw.exists('_FooViewAspect')).toBeTruthy())

    test('Projection on View Entity Present', () => expect(astw.exists('_FooViewProjectionAspect')).toBeTruthy())

    test('Expected Properties Present in View', () => {
        expect(astw.exists('_FooViewAspect', 'removeMeNext', ({type}) => check.isNullable(type, [check.isNumber]))).toBeTruthy()
        expect(astw.exists('_FooViewAspect', 'retainMeOnceMore', ({type}) => check.isNullable(type, [check.isNumber]))).toBeTruthy()
        expect(() => astw.exists('_FooViewAspect', 'removeMe', ({type}) => check.isNullable(type, [check.isNumber]))).toThrow(Error)
        expect(() => astw.exists('_FooViewAspect', 'retainMeOnce', ({type}) => check.isNullable(type, [check.isNumber]))).toThrow(Error)
        expect(() => astw.exists('_FooViewAspect', 'retainMeTwice', ({type}) => check.isNullable(type, [check.isNumber]))).toThrow(Error)
    })

    test('Expected Properties Present in Projection', () => {
        expect(() => astw.exists('_FooViewProjectionAspect', 'removeMe', ({type}) => check.isNullable(type, [check.isNumber]))).toThrow(Error)
        expect(() => astw.exists('_FooViewProjectionAspect', 'retainMeOnce', ({type}) => check.isNullable(type, [check.isNumber]))).toThrow(Error)
        expect(() => astw.exists('_FooViewProjectionAspect', 'retainMeTwice', ({type}) => check.isNullable(type, [check.isNumber]))).toThrow(Error)
        expect(() => astw.exists('_FooViewProjectionAspect', 'removeMeNext', ({type}) => check.isNullable(type, [check.isNumber]))).toThrow(Error)
        expect(astw.exists('_FooViewProjectionAspect', 'Retained', ({type}) => check.isNullable(type, [check.isNumber]))).toBeTruthy()
        
        
    })
})
