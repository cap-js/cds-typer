'use strict'

const fs = require('fs').promises
const path = require('path')
const cds2ts = require('../../lib/compile')
const { ASTWrapper } = require('../ast')
const { locations } = require('../util')

const dir = locations.testOutput('enums_test')

describe('Delimited Identifiers', () => {
    let astw

    beforeEach(async () => await fs.unlink(dir).catch(() => {}))
    beforeAll(async () => {
        const paths = await cds2ts
            .compileFromFile(locations.unit.files('delimident/model.cds'), { outputDirectory: dir, inlineDeclarations: 'structured' })
        astw = new ASTWrapper(path.join(paths[1], 'index.ts'))
    })
    
    test('Properties in Aspect Present', () => {
        expect(astw.getAspectProperty('_FooAspect', 'sap-icon://a')).toBeTruthy()
        const nested = astw.getAspectProperty('_FooAspect', 'sap-icon://b')
        expect(nested).toBeTruthy()
        expect(nested.type.subtypes[0].members[0].name).toBe('sap-icon://c')
        const actions = astw.getAspectProperty('_FooAspect', 'actions')
        expect(actions.type.members.find(fn => fn.name === 'sap-icon://f')).toBeTruthy()
    })
})
