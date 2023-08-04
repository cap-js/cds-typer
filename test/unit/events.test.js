'use strict'

const fs = require('fs').promises
const path = require('path')
const cds2ts = require('../../lib/compile')
const { ASTWrapper } = require('../ast')
const { locations } = require('../util')

const dir = locations.testOutput('events_test')


describe('events', () => {
    let ast

    beforeEach(async () => await fs.unlink(dir).catch(err => {}))
    beforeAll(async () => {
        const paths = await cds2ts
            .compileFromFile(locations.unit.files('events/model.cds'), { outputDirectory: dir, inlineDeclarations: 'structured' })
            // eslint-disable-next-line no-console
            .catch((err) => console.error(err))
        ast = new ASTWrapper(path.join(paths[1], 'index.ts'))
    })

    describe('Event Type Present', () => {
        test('Top Level Event', async () => {
            expect(ast.tree.find(cls => cls.name === 'Bar' 
                && cls.members.length === 2
                && cls.members[0].name === 'id' && cls.members[0].type.keyword === 'number'
                && cls.members[1].name === 'name' && cls.members[1].type.keyword === 'indexedaccesstype'
            )).toBeTruthy()
        })
    })
})