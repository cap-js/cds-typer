'use strict'

const { describe, beforeAll, test, expect } = require('@jest/globals')
const { locations, prepareUnitTest } = require('../util')

describe('Autoexpose', () => {
    let ast

    beforeAll(async () => ast = (await prepareUnitTest('autoexpose/model.cds', locations.testOutput('autoexpose_test'))).astw.tree)

    test('Autoexposed Composition Target Present in Service', async () => {
        expect(ast.find(n => n.name === 'Books')).toBeTruthy()
    })
})