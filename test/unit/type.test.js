'use strict'

const fs = require('fs').promises
const path = require('path')
const cds2ts = require('../../lib/compile')
const { ASTWrapper } = require('../ast')
const { locations } = require('../util')

const dir = locations.testOutput('type_test')


describe('type Definitions', () => {
    let ast

    beforeEach(async () => await fs.unlink(dir).catch(() => {}))
    beforeAll(async () => {
        const paths = await cds2ts
            .compileFromFile(locations.unit.files('type/model.cds'), { outputDirectory: dir, inlineDeclarations: 'structured' })
            // eslint-disable-next-line no-console
            .catch((err) => console.error(err))
        ast = new ASTWrapper(path.join(paths[1], 'index.ts'))
    })
    
    test('All Definitions Present', async () => {
        expect(ast.tree.find(({name, nodeType}) => name === 'IntAlias' && nodeType === 'typeAliasDeclaration')).toBeTruthy()
        expect(ast.tree.find(({name, nodeType}) => name === 'Points' && nodeType === 'typeAliasDeclaration')).toBeTruthy()
        expect(ast.tree.find(({name, nodeType}) => name === 'Lines' && nodeType === 'typeAliasDeclaration')).toBeTruthy()
    })

    test('Types as Properties', async () => {
        const members = ast.tree.find(def => def.name === '_PersonAspect').body[0].members
        expect(members.find(({name, type}) => name === 'id' && type.full === 'IntAlias'))
        expect(members.find(({name, type}) => name === 'pos' && type.full === 'Points'))
        expect(members.find(({name, type}) => name === 'history' && type.full === 'Array' && type.args[0].full === 'Points'))
        expect(members.find(({name, type}) => name === 'line' && type.full === 'Array' && type.args[0].full === 'Points'))
    })
})