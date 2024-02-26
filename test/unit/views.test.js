'use strict'

const { check } = require('../ast')
const { locations, prepareUnitTest } = require('../util')

describe('View Entities', () => {
    let astw

    beforeAll(async () => astw = (await prepareUnitTest('views/model.cds', locations.testOutput('views_test'))).astw)

    test('FooView: View Entity Present', () => expect(astw.exists('_FooViewAspect')).toBeTruthy())

    test('FooView: Expected Properties Present', () => {
        expect(astw.exists('_FooViewAspect', 'id', ({type}) => check.isNullable(type, [check.isNumber]))).toBeTruthy()
        expect(astw.exists('_FooViewAspect', 'code', ({type}) => check.isNullable(type, [check.isString]))).toBeTruthy()
        // including alias
        expect(astw.exists('_FooViewAspect', 'alias', ({type}) => check.isNullable(type, [check.isString]))).toBeTruthy()
    })

    test('FooView: Unselected Field Not Present', () => { expect(() => 
        expect(astw.exists('_FooViewAspect', 'flag', ({type}) => check.isNullable(type, [check.isString]))).toThrow(Error)).toBeTruthy()
    })

    test('FooViewProjection: Projection Entity Present', () => expect(astw.exists('_FooViewProjectionAspect')).toBeTruthy())

    test('FooViewProjection: Expected Properties Present', () => {
        expect(astw.exists('_FooViewProjectionAspect', 'IdProjected', ({type}) => check.isNullable(type, [check.isNumber]))).toBeTruthy()
        expect(astw.exists('_FooViewProjectionAspect', 'AliasProjected', ({type}) => check.isNullable(type, [check.isString]))).toBeTruthy()
    })

    test('FooViewProjection: Unselected Fields Not Present', () => {
        expect(astw.exists('_FooViewProjectionAspect', 'id', 'nonexistent' )).toThrow(Error)
        expect(astw.exists('_FooViewProjectionAspect', 'code','nonexistent')).toThrow(Error)
        expect(astw.exists('_FooViewProjectionAspect', 'alias', 'nonexistent')).toThrow(Error)
        expect(astw.exists('_FooViewProjectionAspect', 'flag', 'nonexistent')).toThrow(Error)
    })
})
