'use strict'

const path = require('path')
const { beforeAll, describe, test, expect } = require('@jest/globals')
const { ASTWrapper } = require('../ast')
const { locations, prepareUnitTest } = require('../util')

describe('Excluding Clause', () => {
    let paths

    beforeAll(async () => paths = (await prepareUnitTest('excluding/model.cds', locations.testOutput('excluding_test'))).paths)

    test('Element Present in Original', async () =>
        expect(new ASTWrapper(path.join(paths[1], 'index.ts')).exists('_TestObjectAspect', 'dependencies')).toBeTruthy())

    test('Element Gone in Projection', async () =>
        expect(new ASTWrapper(path.join(paths[2], 'index.ts'))
            .getAspect('_SlimTestObjectAspect')
            .members
            .find(({name}) => name === 'dependencies')
        ).toBeFalsy())
})