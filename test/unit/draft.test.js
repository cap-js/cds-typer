'use strict'

const path = require('path')
const { describe, it, before } = require('node:test')
const assert = require('assert')
const { ASTWrapper, check } = require('../ast')
const { locations, prepareUnitTest, createSpy } = require('../util')
const { perEachTestConfig } = require('../config')
const { configuration } = require('../../lib/config')

const draftable_ = (entity, ast) => ast.find(n => n.name === entity && n.members.find(({name}) => name === 'drafts'))
const draftable = (entity, ast, plural = e => `${e}_`) => draftable_(entity, ast) && draftable_(plural(entity), ast)

perEachTestConfig(({ outputDTsFiles, outputFile }) =>{
    describe(`Bookshop (using output **/*/${outputFile} files)`, () => {
        before(() => {
            configuration.outputDTsFiles = outputDTsFiles
        })

        it('should validate draft via root and compositions', async () => {
            const paths = (await prepareUnitTest('draft/catalog-service.cds', locations.testOutput('bookshop_projection'))).paths
            const service = new ASTWrapper(path.join(paths[1], outputFile)).tree
            const model = new ASTWrapper(path.join(paths[2], outputFile)).tree

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

        it('should include draft fields on draft-enabled entities and their composition children', async () => {
            const paths = (await prepareUnitTest('draft/catalog-service.cds', locations.testOutput('bookshop_projection'))).paths
            const ast = new ASTWrapper(path.join(paths[1], outputFile))
            for (const aspect of ['_BookAspect', '_PublisherAspect']) {
                // IsActiveEntity is a key field: __.Key<boolean>
                const isActive = ast.getAspectProperty(aspect, 'IsActiveEntity')
                assert.ok(isActive, `${aspect} should have IsActiveEntity`)
                assert.ok(check.isKeyOf(isActive.type, check.isBoolean), `${aspect}.IsActiveEntity should be __.Key<boolean>`)

                // HasActiveEntity / HasDraftEntity are plain boolean
                const hasActive = ast.getAspectProperty(aspect, 'HasActiveEntity')
                assert.ok(hasActive, `${aspect} should have HasActiveEntity`)
                assert.ok(check.isBoolean(hasActive.type), `${aspect}.HasActiveEntity should be boolean`)

                const hasDraft = ast.getAspectProperty(aspect, 'HasDraftEntity')
                assert.ok(hasDraft, `${aspect} should have HasDraftEntity`)
                assert.ok(check.isBoolean(hasDraft.type), `${aspect}.HasDraftEntity should be boolean`)

                // DraftAdministrativeData_DraftUUID is string | null
                const draftUUID = ast.getAspectProperty(aspect, 'DraftAdministrativeData_DraftUUID')
                assert.ok(draftUUID, `${aspect} should have DraftAdministrativeData_DraftUUID`)
                assert.ok(check.isNullable(draftUUID.type, [check.isString]), `${aspect}.DraftAdministrativeData_DraftUUID should be string | null`)
            }
            // associated entity (not a composition) should NOT get draft fields
            assert.ok(!ast.getAspectProperty('_AuthorAspect', 'IsActiveEntity'), '_AuthorAspect should not have IsActiveEntity')
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