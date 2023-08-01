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
        let aspect
        beforeAll(async () => aspect = ast.tree.find(n => n.name === '_EAspect').body[0])

        test('Top Level Event', async () => {
            expect(aspect.members.find(m => m.name === 'stringz' 
                && m.type.full === 'Array' 
                && m.type.args[0].keyword === 'string')).toBeTruthy()
        })    
    })
})