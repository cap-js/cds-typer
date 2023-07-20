'use strict'

const fs = require('fs').promises
const path = require('path')
const cds2ts = require('../../lib/compile')
const { ASTWrapper } = require('../ast')
const { locations } = require('../util')

const dir = locations.testOutput('arrayof_test')


describe('array of', () => {
    let ast

    beforeEach(async () => await fs.unlink(dir).catch(err => {}))
    beforeAll(async () => {
        const paths = await cds2ts
            .compileFromFile(locations.unit.files('arrayof/model.cds'), { outputDirectory: dir, inlineDeclarations: 'structured' })
            // eslint-disable-next-line no-console
            .catch((err) => console.error(err))
        ast = new ASTWrapper(path.join(paths[1], 'index.ts'))
    })

    describe('Entity Properties', () => {
        let aspect
        beforeAll(async () => aspect = ast.tree.find(n => n.name === '_EAspect').body[0])

        test('array of String', async () => {
            expect(aspect.members.find(m => m.name === 'stringz' 
                && m.type.full === 'Array' 
                && m.type.args[0].keyword === 'string')).toBeTruthy()
        })
    
        test('many Integer', async () => {
            expect(aspect.members.find(m => m.name === 'numberz' 
                && m.type.full === 'Array' 
                && m.type.args[0].keyword === 'number')).toBeTruthy()
        })
    
        test('array of locally defined type', async () => {
            expect(aspect.members.find(m => m.name === 'tz' 
                && m.type.full === 'Array' 
                && m.type.args[0].full === 'T')).toBeTruthy()
        })
    
        test('array of externally defined type', async () => {
            expect(aspect.members.find(m => m.name === 'extz' 
                && m.type.full === 'Array' 
                && m.type.args[0].full === '_elsewhere.ExternalType')).toBeTruthy()
        })
    
        test('array of inline type type', async () => {
            expect(aspect.members.find(m => m.name === 'inlinez' 
                && m.type.full === 'Array' 
                && m.type.args[0].keyword === 'typeliteral'
                && m.type.args[0].members.length === 2)).toBeTruthy()
        })
    })

    describe('Function', () => {
        let func
        beforeAll(async () => func = ast.tree.find(n => n.name === 'fn'))

        test('Returning array of String', async () => {
            expect(func.type.type.full === 'Array' && func.type.type.args[0].keyword === 'string').toBeTruthy()
        })

        /*
        // should re-enable these at some point. Needs to do proper function parsing in AST.
        test('Taking array of Number as Parameter', async () => {
            expect(func.type.type.full === 'Array' && func.type.type.args[0].keyword === 'string').toBeTruthy()
        })
        */
    })
})