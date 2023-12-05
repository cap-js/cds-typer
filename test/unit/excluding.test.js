'use strict'

const fs = require('fs').promises
const path = require('path')
const cds2ts = require('../../lib/compile')
const { ASTWrapper } = require('../ast')
const { locations } = require('../util')
const dir = locations.testOutput('excluding_test')

describe('Excluding Clause', () => {
    let paths

    beforeEach(async () => await fs.unlink(dir).catch(() => {}))
    beforeAll(async () => {
        paths = await cds2ts
            .compileFromFile(locations.unit.files('excluding/model.cds'), { outputDirectory: dir })
    })

    test('Element Present in Original', async () => 
        expect(new ASTWrapper(path.join(paths[1], 'index.ts')).exists('_TestObjectAspect', 'dependencies')).toBeTruthy())

    test('Element Gone in Projection', async () => 
            expect(new ASTWrapper(path.join(paths[2], 'index.ts'))
                .getAspect('_SlimTestObjectAspect')
                .members
                .find(({name}) => name === 'dependencies')
            ).toBeFalsy())
})