'use strict'

const { locations, prepareUnitTest } = require('../util')

describe('Autoexpose', () => {
    let ast

    beforeAll(async () => ast = (await prepareUnitTest('autoexpose/service.cds', locations.testOutput('autoexpose_test'))).astw.tree)

    test('Autoexposed Composition Target Present in Service', async () => expect(ast.find(n => n.name === 'Books')).toBeTruthy())
})