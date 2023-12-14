'use strict'

const fs = require('fs').promises
const path = require('path')
const cds2ts = require('../../lib/compile')
const { ASTWrapper } = require('../ast')
const { locations } = require('../util')

const dir = locations.testOutput('scoped_test')

describe('Scoped Entities', () => {
    let astw

    beforeEach(async () => await fs.unlink(dir).catch(() => {}))
    beforeAll(async () => {
        const paths = await cds2ts
            .compileFromFile(locations.unit.files('scoped/model.cds'), { outputDirectory: dir, inlineDeclarations: 'structured' })
        astw = new ASTWrapper(path.join(paths[1], 'index.ts'))
    })

    test('Namespace Exists', () => expect(astw.getModuleDeclaration('Name')).toBeTruthy())
    test('Namespace Entity Exists', () => expect(astw.getAspect('_NameAspect')).toBeTruthy())

    test('Entities Present Within Namespace', () => {
        const namespace = astw.getModuleDeclaration('Name')
        expect(namespace).toBeTruthy()
        expect(namespace.body.find(e => e.name === 'Something')).toBeTruthy()
        expect(namespace.body.find(e => e.name === 'Something_')).toBeTruthy()
    })
})
