'use strict'

const fs = require('fs')
const cds2ts = require('../../lib/compile')
const { toHaveAll, toOnlyHave, toExactlyHave, TSParser } = require('../util')
const { locations } = require('../util')

const dir = locations.testOutput('compilation')

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

    test.skip('Common', async () => {
        // Note (1): certain entities are inflected as singular in the corresponding cds files.
        // These collision are currently resolved by adding a dummy suffix.
        await cds2ts
            .compileFromFile(locations.integration.cloudCapSamples('common/index.cds'), {
                rootDirectory: dir,
            })
            // eslint-disable-next-line no-console
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
