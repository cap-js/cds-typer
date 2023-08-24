'use strict'

const fs = require('fs').promises
const path = require('path')
const cds2ts = require('../../lib/compile')
const { ASTWrapper } = require('../ast')
const { locations } = require('../util')

const dir = locations.testOutput('draft_test')

describe('@odata.draft.enabled', () => {
    let ast
    const draftable_ = entity => ast.find(n => n.name === entity && n.members.find(({name}) => name === 'drafts'))
    const draftable = entity => draftable_(entity) && draftable_(`${entity}_`)

    beforeAll(async () => {
        await fs.unlink(dir).catch(err => {})
        const paths = await cds2ts
            .compileFromFile(locations.unit.files('draft/model.cds'), { outputDirectory: dir })
            // eslint-disable-next-line no-console
            .catch((err) => console.error(err))
        ast = new ASTWrapper(path.join(paths[1], 'index.ts')).tree
    })

    test('Direct Annotation', async () => expect(draftable('A')).toBeTruthy())

    test('First Level Inheritance', async () => expect(draftable('B')).toBeTruthy())

    test('Explicit Override via Inheritance', async () => expect(draftable('C')).not.toBeTruthy())

    test('Inheritance of Explicit Override', async () => expect(draftable('D')).not.toBeTruthy())

    test('Declaration With true', async () => expect(draftable('E')).toBeTruthy())

    test('Multiple Inheritance With Most Significant true', async () => expect(draftable('F')).toBeTruthy())

    test('Multiple Inheritance With Most Significant false', async () => expect(draftable('G')).not.toBeTruthy())

    test('Draftable by Association/ Composition', async () => {
        expect(draftable('H')).not.toBeTruthy()
        expect(draftable('I')).not.toBeTruthy()
        expect(draftable('J')).not.toBeTruthy()
        expect(draftable('K')).not.toBeTruthy()
    })

    test('Unchanged by Association/ Composition', async () => {
        expect(draftable('L')).not.toBeTruthy()
        expect(draftable('M')).not.toBeTruthy()
    })

    test('Precedence Over Explicit Annotation', async () => {
        expect(draftable('P')).toBeTruthy()
        expect(draftable('Q')).toBeTruthy()
    })

    test('Via Projection', async () => expect(draftable('PA')).toBeTruthy())

    test('Transitive Via Projection and Composition', async () => {
        expect(draftable('ProjectedReferrer')).toBeTruthy()
        expect(draftable('Referrer')).toBeTruthy()
        expect(draftable('Referenced')).toBeTruthy()
    })

    test('Transitive Via Multiple Levels of Projection', async () => {
        expect(draftable('Foo')).toBeTruthy()
        expect(draftable('ProjectedFoo')).toBeTruthy()
        expect(draftable('ProjectedProjectedFoo')).toBeTruthy()
    })
})