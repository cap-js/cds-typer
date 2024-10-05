'use strict'

const path = require('path')
const { ASTWrapper } = require('../ast')
const { locations, prepareUnitTest } = require('../util')

const draftable_ = (entity, ast) => ast.find(n => n.name === entity && n.members.find(({name}) => name === 'drafts'))
const draftable = (entity, ast, plural = e => `${e}_`) => draftable_(entity, ast) && draftable_(plural(entity), ast)

describe('bookshop', () => {
    test('Draft via root and compositions', async () => {
        const paths = (await prepareUnitTest('draft/catalog-service.cds', locations.testOutput('bookshop_projection'))).paths
        const service = new ASTWrapper(path.join(paths[1], 'index.ts')).tree
        const model = new ASTWrapper(path.join(paths[2], 'index.ts')).tree

        // root and composition become draft enabled
        expect(draftable('Book', service, () => 'Books')).toBeTruthy()
        expect(draftable('Publisher', service, () => 'Publishers')).toBeTruthy()
        
        // associated entity will not become draft enabled
        expect(draftable('Author', service, () => 'Authors')).toBeFalsy()

        // non-service entities will not be draft enabled
        expect(draftable('Book', model, () => 'Books')).toBeFalsy()
        expect(draftable('Publisher', model, () => 'Publishers')).toBeFalsy()
        expect(draftable('Author', model, () => 'Authors')).toBeFalsy()
    })

    test('Draft-enabled composition produces compiler error', async () => {
        const spyOnConsole = jest.spyOn(console, 'error')
        await prepareUnitTest('draft/catalog-service-error.cds', locations.testOutput('bookshop_projection'), {typerOptions: {logLevel: 'ERROR'}})

        expect(spyOnConsole).toHaveBeenCalledWith(
            '[cds-typer] -',
            'Composition in draft-enabled entity can\'t lead to another entity with "@odata.draft.enabled" (in entity: "bookshop.service.CatalogService.Books"/element: publishers)!'
        )
    })
})