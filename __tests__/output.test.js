'use strict'

const { deepEqual, deepStrictEqual } = require('assert')
const fs = require('fs')
const path = require('path')
const cds2ts = require('../lib/compile')
const { toHaveAll, toOnlyHave, toExactlyHave, TSParser } = require('./util')

const dir = './__tests__/files/output/'

expect.extend({ toHaveAll, toOnlyHave, toExactlyHave })

// compilation produces semantically complete Typescript
describe('Compilation', () => {
    beforeEach(() => {
        try {
            fs.unlinkSync(dir)
        } catch (err) {
            //console.log('INFO', `Unable to unlink '${dir}' (${err}). This may not be an issue.`)
        }
    })

    test('bookshoplet', async () => {
        const paths = await cds2ts
            .compileFromFile('./__tests__/files/bookshoplet/model.cds', {
                rootDirectory: dir,
            })
            .catch((err) => console.error(err))
        expect(paths).toHaveLength(2) // the one module [1] + baseDefinitions [0]
        const { namespaces } = new TSParser().parse(path.join(paths[1], 'index.ts'))
        const classes = namespaces.top.classes
        const expectedProps = [
            'BookAspect',
            'Books',
            'AuthorAspect',
            'Authors',
            'GenreAspect',
            'Genres',
            'AAspect',
            'A_',
            'BAspect',
            'B_',
            'CAspect',
            'C_',
            'DAspect',
            'D_',
            'EAspect',
            'E_'
        ]
        expect(classes).toExactlyHave(expectedProps)
        expect(classes.BookAspect).toExactlyHave([
            'ID',
            'title',
            'descr',
            'author',
            'genre',
            'stock',
            'price',
            'currency',
            'image',
        ])
    })

    test('inflection', async () => {
        const paths = await cds2ts
            .compileFromFile('./__tests__/files/inflection/model.cds', {
                rootDirectory: dir,
            })
            .catch((err) => console.error(err))
        const { namespaces, declarations } = new TSParser().parse(path.join(paths[1], 'index.ts'))

        const expectedProps = [
            'GizmoAspect',
            'Gizmos',
            'FooSingularAspect',
            'Foos',
            'BarAspect',
            'BarPlural',
            'BazSingularAspect',
            'BazPlural'
        ]
        expect(namespaces.top.classes).toExactlyHave(expectedProps) //map((p) => p[0]))
        expect(namespaces).toExactlyHave(['top'])
    })

    test('common', async () => {
        // Note (1): certain entities are inflected as singular in the corresponding cds files.
        // See: https://github.tools.sap/cap/cds-tools/issues/223
        // These collision are currently resolved by adding a dummy suffix.
        await cds2ts
            .compileFromFile('./__tests__/files/cloud-cap-samples/common/index.cds', {
                rootDirectory: dir,
            })
            .catch((err) => console.error(err))
        const common = new TSParser().parse(dir + '/sap/common/index.ts')
        expect(common).toStrictEqual({
            imports: [
                {
                    imports: '*',
                    alias: '__',
                    from: './../../_',
                },
                {
                    imports: '*',
                    alias: '_sap_common_countries',
                    from: './countries',
                },
            ],
            namespaces: {
                top: {
                    declarations: {},
                    classes: {
                        CountryAspect: {
                            code: ['string'],
                            regions: ['__.Composition.of.many<_sap_common_countries.Regions>'],
                        },
                        Countries: {},
                        CurrencyAspect: {
                            code: ['string'],
                            symbol: ['string'],
                            numcode: ['number'],
                            exponent: ['number'],
                            minor: ['string'],
                        },
                        Currencies: {},
                        LanguageAspect: {
                            code: ['Locale'],
                        },
                        Languages: {},
                        CodeListAspect: {
                            descr: ['string'],
                            name: ['string'],
                        },
                    },
                },
            },
        })
    })
})
