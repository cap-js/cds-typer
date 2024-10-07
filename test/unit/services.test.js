'use strict'

const { beforeAll, describe, test, expect } = require('@jest/globals')
const { check } = require('../ast')
const { locations, prepareUnitTest } = require('../util')

describe('services', () => {
    let astw

    beforeAll(async () => astw = (await prepareUnitTest('services/model.cds', locations.testOutput('services_test'))).astw)

    describe('Service', () => {
        test('Top Level Event', async () => {
            console.log(1)
        })
    })
})