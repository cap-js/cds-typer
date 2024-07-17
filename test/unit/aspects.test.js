'use strict'

const { beforeAll, describe, test, expect } = require('@jest/globals')
const { locations, prepareUnitTest } = require('../util')

describe('CDS Aspects', () => {
    let astw

    beforeAll(async () => astw = (await prepareUnitTest('aspects/model.cds', locations.testOutput('aspect_test'))).astw)

    test('Aspect in Singular Form', () => {
        expect(astw.tree.find(n => n.name === '_PersonAspect')).toBeTruthy()
    })
})