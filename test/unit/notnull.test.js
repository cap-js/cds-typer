'use strict'

const fs = require('fs').promises
const path = require('path')
const cds2ts = require('../../lib/compile')
const { ASTWrapper, check, checkFunction } = require('../ast')
const { locations } = require('../util')

const dir = locations.testOutput('not_null_test')


describe('Not Null', () => {
    let astw

    beforeEach(async () => await fs.unlink(dir).catch(() => {}))
    beforeAll(async () => {
        const paths = await cds2ts
            .compileFromFile(locations.unit.files('notnull/model.cds'), { outputDirectory: dir, inlineDeclarations: 'structured' })
        astw = new ASTWrapper(path.join(paths[1], 'index.ts'))
    })

    describe('Properties', () => {
        test('Primitive', async () => 
            expect(astw.getAspects().find(({name, members}) => name === '_EAspect'
            && members?.find(member => member.name === 'x' && !check.isNullable(member.type) && check.isNumber(member.type))))
            .toBeTruthy())

        test('Association to One', async () => 
            expect(astw.getAspects().find(({name, members}) => name === '_EAspect'
            && members?.find(member => member.name === 'foo_assoc' && !check.isNullable(member.type))))
            .toBeTruthy())
        
        test('Association to Many', async () => 
            expect(astw.getAspects().find(({name, members}) => name === '_EAspect'
            && members?.find(member => member.name === 'foos_assoc' && !check.isNullable(member.type))))
            .toBeTruthy())

        test('Composition of One', async () => 
            expect(astw.getAspects().find(({name, members}) => name === '_EAspect'
            && members?.find(member => member.name === 'foo_comp' && !check.isNullable(member.type))))
            .toBeTruthy())
        
        test('Composition of Many', async () => 
            expect(astw.getAspects().find(({name, members}) => name === '_EAspect'
            && members?.find(member => member.name === 'foos_comp' && !check.isNullable(member.type))))
            .toBeTruthy())

        test('Inline', async () => 
            expect(astw.getAspects().find(({name, members}) => name === '_EAspect'
            && members?.find(member => member.name === 'inline' 
                && !check.isNullable(member.type)
                && !check.isNullable(member.type.members[0]))))
            .toBeTruthy())
    })


    describe('Actions', () => {
        test('Bound', async () => {
            const actions = astw.getAspectProperty('_EAspect', 'actions')
            checkFunction(actions.type.members.find(fn => fn.name === 'f'), {
                parameterCheck: ({members: [fst]}) => fst.name === 'x' && !check.isNullable(fst.type)
            })
        })
        
        test('Unbound', async () => {
            checkFunction(astw.tree.find(node => node.name === 'free'), {
                callCheck: type => !check.isNullable(type),
                parameterCheck: ({members: [fst]}) => fst.name === 'param' && !check.isNullable(fst.type),
                returnTypeCheck: type => !check.isNullable(type)
            })
        })
    })


    
})
