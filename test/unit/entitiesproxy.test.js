'use strict'

const path = require('path')
const cds = require('@sap/cds')
const { beforeAll, afterEach, describe, test, expect } = require('@jest/globals')
const { JSASTWrapper } = require('../ast')
const { locations, prepareUnitTest } = require('../util')

describe('Compilation/Runtime - with Entities Proxies', () => {
    let paths

    describe('Compile Bookshoplet', () => {
        beforeAll(
            async () =>
                ({ paths } = await prepareUnitTest(
                    'bookshoplet/model.cds',
                    locations.testOutput('entities_proxy_test/bookshoplet'),
                    { typerOptions: { useEntitiesProxy: true } }
                ))
        )

        test('index.js', async () => {
            const jsw = await JSASTWrapper.initialise(path.join(paths[1], 'index.js'), true)
            // cds.entities must not be used directly
            expect(jsw.hasCdsEntitiesAccess()).toBeFalsy()
            // check if exports are used in proxy function call
            jsw.exportsAre([
                ['Book', 'Books'],
                ['Books', 'Books'],
                ['Books.text', 'Books.texts'],
                ['Books.texts', 'Books.texts'],
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
                ['QueryEntity', 'QueryEntity'],
            ])
        })
    })

    describe('Inline Enum compilation', () => {
        beforeAll(
            async () =>
                ({ paths } = await prepareUnitTest(
                    'enums/model.cds',
                    locations.testOutput('entities_proxy_test/enums'),
                    { typerOptions: { useEntitiesProxy: true } }
                ))
        )

        test('Inline enum names passed to proxy function call', async () => {
            const jsw = await JSASTWrapper.initialise(path.join(paths[1], 'index.js'), true)

            jsw.hasProxyExport('InlineEnum', ['gender', 'status', 'yesno'])
            jsw.hasProxyExport('TypeWithInlineEnum', ['inlineEnumProperty'])
        })
    })

    describe('Runtime Checks for Entity Proxies', () => {
        beforeAll(
            async () =>
                ({ paths } = await prepareUnitTest(
                    'entitiesproxy/service.cds',
                    path.join(__dirname, 'files', 'entitiesproxy', '_out'),
                    {
                        typerOptions: { useEntitiesProxy: true },
                    }
                ))
        )
        afterEach(() => {
            // tear down loaded cds model
            cds.model = undefined
        })

        test('Invalid \'elements\' access via proxy before cds is loaded', async () => {
            const { Books } = require(paths[1])

            expect(() => Books.elements).toThrow(
                new Error(
                    'Property elements does not exist on entity \'bookshop.CatalogService.Books\' or cds.entities is not yet defined. Ensure the CDS runtime is fully booted before accessing properties.'
                )
            )
        })

        test('Inline enum access via proxy export without cds runtime', () => {
            const { Book } = require(paths[1])

            expect(Book.genre).toStrictEqual({ Fantasy: 'Fantasy', SciFi: 'Science-Fiction' })
        })

        test('Use entity proxy as stand-in for definition from cds.entities', async () => {
            const { Books, Book } = require(paths[1])
            const base = path.join(__dirname, 'files', 'entitiesproxy')
            cds.root = base
            cds.model = cds.linked(await cds.load(path.join(base, 'service.cds')))
            await cds.serve('all')

            expect(Books.name).toBe('bookshop.CatalogService.Books')
            expect(Book.name).toBe('bookshop.CatalogService.Books')

            expect(Book.elements).toBe(cds.entities('bookshop.CatalogService').Books.elements)

            // test service registration with proxy
            const catService = cds.services['bookshop.CatalogService']
            catService.prepend(srv => {
                expect(srv.after('READ', Books, () => {})).toBe(srv)
            })
        })

        test('Use entity proxy for entity without namespace', async () => {
            const { Publishers, Publisher } = require(paths[2])

            // access name property before cds runtime is loaded
            expect(Publisher.name).toBe('Publishers')
            expect(Publishers.name).toBe('Publishers')

            const base = path.join(__dirname, 'files', 'entitiesproxy')
            cds.root = base
            cds.model = cds.linked(await cds.load(path.join(base, 'nonamespace.cds')))
            await cds.serve('all')

            // access name after cds runtime is loaded
            expect(Publisher.name).toBe('Publishers')
            expect(Publishers.name).toBe('Publishers')
        })
    })
})
