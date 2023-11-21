'use strict'

const fs = require('fs').promises
const path = require('path')
const cds2ts = require('../../lib/compile')
const { ASTWrapper } = require('../ast')
const { locations } = require('../util')

const dir = locations.testOutput('draft_test')
const draftable_ = (entity, ast) => ast.find(n => n.name === entity && n.members.find(({name}) => name === 'drafts'))
const draftable = (entity, ast, plural = e => `${e}_`) => draftable_(entity, ast) && draftable_(plural(entity), ast)

describe('bookshop', () => {
    test('Projections Up and Down', async () => {
        const paths = await cds2ts.compileFromFile(locations.unit.files('draft/catalog-service.cds'), { outputDirectory: dir })
        const service = new ASTWrapper(path.join(paths[1], 'index.ts')).tree
        const model = new ASTWrapper(path.join(paths[2], 'index.ts')).tree
        
        expect(draftable('Book', service, () => 'Books')).toBeTruthy()
        expect(draftable('Publisher', service, () => 'Publishers')).toBeTruthy()
        expect(draftable('Book', model, () => 'Books')).toBeTruthy()
        expect(draftable('Publisher', model, () => 'Publishers')).toBeTruthy()
    })
})

describe('@odata.draft.enabled', () => {
    let ast

    beforeAll(async () => {
        await fs.unlink(dir).catch(() => {})
        const paths = await cds2ts
            .compileFromFile(locations.unit.files('draft/model.cds'), { outputDirectory: dir })
        ast = new ASTWrapper(path.join(paths[1], 'index.ts')).tree
    })

    test('Direct Annotation', async () => expect(draftable('A', ast)).toBeTruthy())

    test('First Level Inheritance', async () => expect(draftable('B', ast)).toBeTruthy())

    test('Explicit Override via Inheritance', async () => expect(draftable('C', ast)).not.toBeTruthy())

    test('Inheritance of Explicit Override', async () => expect(draftable('D', ast)).not.toBeTruthy())

    test('Declaration With true', async () => expect(draftable('E', ast)).toBeTruthy())

    test('Multiple Inheritance With Most Significant true', async () => expect(draftable('F', ast)).toBeTruthy())

    test('Multiple Inheritance With Most Significant false', async () => expect(draftable('G', ast)).not.toBeTruthy())

    test('Draftable by Association/ Composition', async () => {
        expect(draftable('H', ast)).not.toBeTruthy()
        expect(draftable('I', ast)).not.toBeTruthy()
        expect(draftable('J', ast)).not.toBeTruthy()
        expect(draftable('K', ast)).not.toBeTruthy()
    })

    test('Unchanged by Association/ Composition', async () => {
        expect(draftable('L', ast)).not.toBeTruthy()
        expect(draftable('M', ast)).not.toBeTruthy()
    })

    test('Precedence Over Explicit Annotation', async () => {
        expect(draftable('P', ast)).toBeTruthy()
        expect(draftable('Q', ast)).toBeTruthy()
    })

    test('Via Projection', async () => expect(draftable('PA', ast)).toBeTruthy())

    test('Transitive Via Projection and Composition', async () => {
        expect(draftable('ProjectedReferrer', ast)).toBeTruthy()
        expect(draftable('Referrer', ast)).toBeTruthy()
        expect(draftable('Referenced', ast)).toBeTruthy()
    })

    test('Transitive Via Multiple Levels of Projection', async () => {
        expect(draftable('Foo', ast)).toBeTruthy()
        expect(draftable('ProjectedFoo', ast)).toBeTruthy()
        expect(draftable('ProjectedProjectedFoo', ast)).toBeTruthy()
    })
})