'use strict'

const fs = require('fs').promises
const path = require('path')
const cds2ts = require('../../lib/compile')
const { ASTWrapper } = require('../ast')
const { locations } = require('../util')

const dir = locations.testOutput('foreign_keys')

describe('Foreign Keys', () => {
    let ast
    beforeEach(async () => await fs.unlink(dir).catch(() => {}))
    beforeAll(async () => {
        const paths = await cds2ts
            .compileFromFile(locations.unit.files('foreignkeys/model.cds'), { outputDirectory: dir })
        ast = new ASTWrapper(path.join(paths[1], 'index.ts'))
    })

    test('One Level Deep', async () => {
        expect(ast.exists('_BAspect', 'c_ID', m => m.type.keyword === 'string')).toBeTruthy()
        expect(ast.exists('_BAspect', 'd_ID', m => m.type.keyword === 'string')).toBeTruthy()
        expect(ast.exists('_CAspect', 'e_ID', m => m.type.keyword === 'string')).toBeTruthy()
    })

    test('Two Levels Deep', async () => {
        expect(ast.exists('_AAspect', 'b_c_ID', m => m.type.keyword === 'string')).toBeTruthy()
        expect(ast.exists('_AAspect', 'b_d_ID', m => m.type.keyword === 'string')).toBeTruthy()
        expect(ast.exists('_BAspect', 'c_e_ID', m => m.type.keyword === 'string')).toBeTruthy()
    })

    test('Three Levels Deep', async () => {
        expect(ast.exists('_AAspect', 'b_c_e_ID', m => m.type.keyword === 'string')).toBeTruthy()
    })
})