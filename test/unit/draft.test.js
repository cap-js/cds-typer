'use strict'

const path = require('path')
const cds = require('@sap/cds')
const { describe, it, before } = require('node:test')
const assert = require('assert')
const { ASTWrapper, check } = require('../ast')
const { locations, prepareUnitTest, createSpy } = require('../util')
const { perEachTestConfig } = require('../config')
const { configuration } = require('../../lib/config')
const { DRAFT_FIELDS } = require('../../lib/visitor')

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

// Guards the hardcoded DRAFT_FIELDS in lib/visitor.js against the actual CAP runtime.
// We synthesise these fields instead of running `cds.compile.for.odata` during generation;
// this test runs the real OData transformation and asserts our set + types still match it,
// so a future @sap/cds change to the draft contract is caught here rather than silently drifting.
describe('Draft fields match the CAP runtime', () => {
    // field name -> normalised shape {type, key?, notNull?}, derived from DRAFT_FIELDS
    const ours = Object.fromEntries(Object.entries(DRAFT_FIELDS).map(([name, el]) => [
        name,
        { type: el.type, ...(el.key ? { key: true } : {}), ...(el.notNull ? { notNull: true } : {}) },
    ]))

    const shapeOf = el => ({ type: el.type, ...(el.key ? { key: true } : {}), ...(el.notNull ? { notNull: true } : {}) })

    it('synthesised DRAFT_FIELDS equal the fields the OData transformation emits (root + composition child)', async () => {
        const model = path.join(locations.unit.files('draft'), 'catalog-service.cds')
        const odata = cds.linked(cds.compile.for.odata(await cds.load(model)))
        const prefix = 'bookshop.service.CatalogService.'

        const draftEntities = Object.entries(odata.definitions).filter(
            ([name, def]) => name.startsWith(prefix) && def.elements?.IsActiveEntity
        )
        // Books (root) + Publishers (composition child) carry draft fields; Authors (association) must not
        assert.ok(draftEntities.some(([n]) => n === `${prefix}Books`), 'root should carry draft fields')
        assert.ok(draftEntities.some(([n]) => n === `${prefix}Publishers`), 'composition child should carry draft fields')
        assert.ok(!odata.definitions[`${prefix}Authors`]?.elements?.IsActiveEntity, 'association target must not carry draft fields')

        for (const [name, def] of draftEntities) {
            // every field we synthesise exists in the runtime with the same shape
            for (const [field, shape] of Object.entries(ours)) {
                const real = def.elements[field]
                assert.ok(real, `runtime ${name} is missing field we synthesise: ${field}`)
                assert.deepStrictEqual(shapeOf(real), shape, `shape drift for ${name}.${field}`)
            }
            // and the runtime has no scalar draft field we are NOT synthesising
            // (DraftAdministrativeData is the association itself, flattened into _DraftUUID which we do cover)
            for (const field of Object.keys(def.elements)) {
                if (!/^(IsActiveEntity|HasActiveEntity|HasDraftEntity|DraftAdministrativeData_)/.test(field)) continue
                assert.ok(field in ours, `runtime ${name} has draft field we do not synthesise: ${field}`)
            }
        }
    })
})
