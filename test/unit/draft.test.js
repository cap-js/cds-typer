'use strict'

const path = require('path')
const { describe, it, before } = require('node:test')
const assert = require('assert')
const { ASTWrapper } = require('../ast')
const { locations, prepareUnitTest, createSpy } = require('../util')
const { perEachTestConfig } = require('../config')
const { configuration } = require('../../lib/config')

const draftable_ = (entity, ast) => ast.find(n => n.name === entity && n.members.find(({name}) => name === 'drafts'))
const draftable = (entity, ast, plural = e => `${e}_`) => draftable_(entity, ast) && draftable_(plural(entity), ast)

perEachTestConfig(options =>{
    describe(`Bookshop (using output **/*/${options.output_file} files)`, () => {
        before(() => {
            configuration.outputDTsFiles = options.output_d_ts_files
        })

        it('should validate draft via root and compositions', async () => {
            const paths = (await prepareUnitTest('draft/catalog-service.cds', locations.testOutput('bookshop_projection'))).paths
            const service = new ASTWrapper(path.join(paths[1], options.output_file)).tree
            const model = new ASTWrapper(path.join(paths[2], options.output_file)).tree

            // root and composition become draft enabled
            assert.ok(draftable('Book', service, () => 'Books'))
            assert.ok(draftable('Publisher', service, () => 'Publishers'))

            // associated entity will not become draft enabled
            assert.ok(!draftable('Author', service, () => 'Authors'))

            // non-service entities will not be draft enabled
            assert.ok(!draftable('Book', model, () => 'Books'))
            assert.ok(!draftable('Publisher', model, () => 'Publishers'))
            assert.ok(!draftable('Author', model, () => 'Authors'))
        })

        it('should produce compiler error for draft-enabled composition', async () => {
            // eslint-disable-next-line no-console
            const spyOnConsole = createSpy(console.error)
            // eslint-disable-next-line no-console
            console.error = spyOnConsole

            await assert.rejects(
                prepareUnitTest('draft/error-catalog-service.cds', locations.testOutput('bookshop_projection'), {
                    typerOptions: { logLevel: 'ERROR' },
                }),
                new Error('Compilation of model failed')
            )

            assert.ok(spyOnConsole.calledWith(
                '[cds-typer] -',
                'Composition in draft-enabled entity can\'t lead to another entity with "@odata.draft.enabled" (in entity: "bookshop.service.CatalogService.Books"/element: publishers)!'
            ))
        })
    })
})