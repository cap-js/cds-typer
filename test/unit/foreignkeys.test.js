'use strict'

const { beforeAll, describe, test, expect } = require('@jest/globals')
const { locations, prepareUnitTest } = require('../util')
const { check } = require('../ast')

describe('Foreign Keys', () => {
    let astw
    beforeAll(async () => astw = (await prepareUnitTest('foreignkeys/model.cds', locations.testOutput('foreign_keys'))).astw)

    test('One Level Deep', async () => {
        expect(astw.exists('_BAspect', 'c_ID', ({type}) => check.isString(type))).toBeTruthy()
        expect(astw.exists('_BAspect', 'd_ID', ({type}) => check.isString(type))).toBeTruthy()
        expect(astw.exists('_CAspect', 'e_ID', ({type}) => check.isString(type))).toBeTruthy()
    })

    test('Two Levels Deep', async () => {
        expect(astw.exists('_AAspect', 'b_c_ID', ({type}) => check.isString(type))).toBeTruthy()
        expect(astw.exists('_AAspect', 'b_d_ID', ({type}) => check.isString(type))).toBeTruthy()
        expect(astw.exists('_BAspect', 'c_e_ID', ({type}) => check.isString(type))).toBeTruthy()
    })

    test('Three Levels Deep', async () => {
        expect(astw.exists('_AAspect', 'b_c_e_ID', ({type}) => check.isString(type))).toBeTruthy()
    })
})