'use strict'

const path = require('path')
const { beforeAll, describe, test, expect } = require('@jest/globals')
const { JSASTWrapper } = require('../ast')
const { locations, prepareUnitTest } = require('../util')

describe('Compilation - with Entities Proxies', () => {
    let paths

    describe('Bookshoplet', () => {

        beforeAll(async () => ({paths} = await prepareUnitTest('bookshoplet/model.cds', locations.testOutput('entities_proxy_test/bookshoplet'), {typerOptions: {useEntitiesProxy: true}})))

        test('index.js', async () => {
            const jsw = await JSASTWrapper.initialise(path.join(paths[1], 'index.js'), true)
            // cds.entities must not be used directly
            expect(jsw.hasCdsEntitiesAccess()).toBeFalsy()
            // check if exports are used in proxy function call
            jsw.exportsAre([
                ['Book', 'Books'],
                ['Books', 'Books'],
                ['Author', 'Authors'],
                ['Authors', 'Authors'],
                ['Genre', 'Genres'],
                ['Genres', 'Genres'],
                ['A_', 'A'],
                ['A', 'A'],
                ['B_', 'B'],
                ['B', 'B'],
                ['C_', 'C'],
                ['C', 'C'],
                ['D_', 'D'],
                ['D', 'D'],
                ['E_', 'E'],
                ['E', 'E'],
                ['QueryEntity_', 'QueryEntity'],
                ['QueryEntity', 'QueryEntity']
            ])
        })
    })

    describe('Enums', () => {
        beforeAll(async () => ({paths} = await prepareUnitTest('enums/model.cds', locations.testOutput('entities_proxy_test/enums'), {typerOptions: {useEntitiesProxy: true}})))

        test('Inline enum names passed to proxy function call', async () => {
            const jsw = await JSASTWrapper.initialise(path.join(paths[1], 'index.js'), true)

            jsw.hasProxyExport('InlineEnum', ['gender', 'status', 'yesno'])
            jsw.hasProxyExport('TypeWithInlineEnum', ['inlineEnumProperty'])
        })
    })
})
