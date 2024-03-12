'use strict'

const { check } = require('../ast')
const { locations, prepareUnitTest } = require('../util')

describe('View Entities', () => {
    let astw

    beforeAll(async () => astw = (await prepareUnitTest('views/model.cds', locations.testOutput('views_test'))).astw)

    test('View Entity Present', () => expect(astw.exists('_FooViewAspect')).toBeTruthy())

    test('Expected Properties Present', () => {
        expect(astw.exists('_FooViewAspect', 'id', ({type}) => check.isNullable(type, [check.isNumber]))).toBeTruthy()
        expect(astw.exists('_FooViewAspect', 'code', ({type}) => check.isNullable(type, [check.isString]))).toBeTruthy()
        // including alias
        expect(astw.exists('_FooViewAspect', 'alias', ({type}) => check.isNullable(type, [check.isString]))).toBeTruthy()
    })

    test('Unselected Field Not Present', () => { expect(() => 
        expect(astw.exists('_FooViewAspect', 'flag', ({type}) => check.isNullable(type, [check.isString]))).toThrow(Error)).toBeTruthy()
    })

    test('Combining * and Explicit Selection', () => { () => 
        expect(astw.exists('_FooView2Aspect', 'id', ({type}) => check.isNullable(type, [check.isNumber]))).toBeTruthy()
        expect(astw.exists('_FooView2Aspect', 'id2', ({type}) => check.isNullable(type, [check.isNumber]))).toBeTruthy()
        expect(astw.exists('_FooView2Aspect', 'code', ({type}) => check.isNullable(type, [check.isString]))).toBeTruthy()
    })
})
