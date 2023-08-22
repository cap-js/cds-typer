'use strict'

const fs = require('fs').promises
const path = require('path')
const cds2ts = require('../../lib/compile')
const { ASTWrapper } = require('../ast')
const { locations } = require('../util')

const dir = locations.testOutput('draft_test')

describe('@odata.draft.enabled', () => {
    let ast

    beforeAll(async () => {
        await fs.unlink(dir).catch(err => {})
        const paths = await cds2ts
            .compileFromFile(locations.unit.files('draft/model.cds'), { outputDirectory: dir })
            // eslint-disable-next-line no-console
            .catch((err) => console.error(err))
        ast = new ASTWrapper(path.join(paths[1], 'index.ts')).tree
    })

    test('Direct Annotation', async () => {
        expect(ast.find(n => n.name === 'A' && n.members.find(({name}) => name === 'drafts' ))).toBeTruthy()
        expect(ast.find(n => n.name === 'A_' && n.members.find(({name}) => name === 'drafts' ))).toBeTruthy()
    })

    test('First Level Inheritance', async () => {
        expect(ast.find(n => n.name === 'B' && n.members.find(({name}) => name === 'drafts' ))).toBeTruthy()
        expect(ast.find(n => n.name === 'B_' && n.members.find(({name}) => name === 'drafts' ))).toBeTruthy()
    })

    test('Explicit Override via Inheritance', async () => {
        expect(ast.find(n => n.name === 'C' && n.members.find(({name}) => name === 'drafts' ))).not.toBeTruthy()
        expect(ast.find(n => n.name === 'C_' && n.members.find(({name}) => name === 'drafts' ))).not.toBeTruthy()
    })

    test('Inheritance of Explicit Override', async () => {
        expect(ast.find(n => n.name === 'D' && n.members.find(({name}) => name === 'drafts' ))).not.toBeTruthy()
        expect(ast.find(n => n.name === 'D_' && n.members.find(({name}) => name === 'drafts' ))).not.toBeTruthy()
    })

    test('Declaration With true', async () => {
        expect(ast.find(n => n.name === 'E' && n.members.find(({name}) => name === 'drafts' ))).toBeTruthy()
        expect(ast.find(n => n.name === 'E_' && n.members.find(({name}) => name === 'drafts' ))).toBeTruthy()
    })

    test('Multiple Inheritance With Most Significant true', async () => {
        expect(ast.find(n => n.name === 'F' && n.members.find(({name}) => name === 'drafts' ))).toBeTruthy()
        expect(ast.find(n => n.name === 'F_' && n.members.find(({name}) => name === 'drafts' ))).toBeTruthy()
    })

    test('Multiple Inheritance With Most Significant false', async () => {
        expect(ast.find(n => n.name === 'G' && n.members.find(({name}) => name === 'drafts' ))).not.toBeTruthy()
        expect(ast.find(n => n.name === 'G_' && n.members.find(({name}) => name === 'drafts' ))).not.toBeTruthy()
    })
})