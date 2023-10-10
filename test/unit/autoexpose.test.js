'use strict'

const fs = require('fs').promises
const path = require('path')
const { ASTWrapper, checkFunction, check } = require('../ast')
const { locations, cds2ts } = require('../util')

const dir = locations.testOutput('autoexpose_test')

describe('Autoexpose', () => {
    beforeEach(async () => await fs.unlink(dir).catch(_ => {}))

    test('Autoexposed Composition Target Present in Service', async () => {
        const paths = await cds2ts('autoexpose/service.cds', { outputDirectory: dir, inlineDeclarations: 'structured' })
        const ast = new ASTWrapper(path.join(paths[1], 'index.ts')).tree
        expect(ast.find(n => n.name === 'Books')).toBeTruthy()
    })
})