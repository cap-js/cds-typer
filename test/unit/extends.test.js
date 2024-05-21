'use strict'

const path = require('path')
const { describe, beforeAll, test, expect } = require('@jest/globals')
const { ASTWrapper } = require('../ast')
const { locations, prepareUnitTest } = require('../util')


describe('extends', () => {
    let astw

    beforeAll(async () => astw = (await prepareUnitTest('extends/model.cds', locations.testOutput('extends_test'))).astw)

    test('Projections Up and Down', async () => {

    })
})
