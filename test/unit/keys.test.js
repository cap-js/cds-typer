'use strict'

const { beforeAll, describe, test } = require('@jest/globals')
const { locations, prepareUnitTest } = require('../util')

describe('KeyOf', () => {
    let astw

    beforeAll(async () => astw = (await prepareUnitTest('keys/model.cds', locations.testOutput('keys_test'))).astw)

    test('test', () => {
        const actions = astw.getAspectProperty('_CAspect', 'keys')
        console.log(actions)
    })

})