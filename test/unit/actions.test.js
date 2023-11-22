'use strict'

const fs = require('fs').promises
const path = require('path')
const { ASTWrapper, checkFunction, check } = require('../ast')
const { locations, cds2ts } = require('../util')

const dir = locations.testOutput('actions_test')

describe('Actions', () => {
    beforeEach(async () => await fs.unlink(dir).catch(() => {}))

    test('Bound', async () => {
        const paths = await cds2ts('actions/model.cds', { outputDirectory: dir, inlineDeclarations: 'structured' })
        const astw = new ASTWrapper(path.join(paths[1], 'index.ts'))
        const actions = astw.getAspectProperty('_EAspect', 'actions')
        expect(actions.modifiers.some(check.isStatic)).toBeTruthy()
        checkFunction(actions.type.members.find(fn => fn.name === 'f'), {
            parameterCheck: ({members: [fst]}) => fst.name === 'x' && check.isString(fst.type)
        })
        checkFunction(actions.type.members.find(fn => fn.name === 'g'), {
            parameterCheck: ({members: [fst, snd]}) => {
                const fstCorrect = fst.name === 'a' && fst.type.members[0].name === 'x' && check.isNumber(fst.type.members[0].type)
                    && fst.type.members[1].name === 'y' && check.isNumber(fst.type.members[1].type)
                const sndCorrect = snd.name === 'b' && check.isNumber(snd.type)
                return fstCorrect && sndCorrect
            }
        })
    })

    test('Unbound', async () => {
        const paths = await cds2ts('actions/model.cds', { outputDirectory: dir, inlineDeclarations: 'structured' })
        const ast = new ASTWrapper(path.join(paths[2], 'index.ts')).tree
        checkFunction(ast.find(node => node.name === 'free'), {
            modifiersCheck: (modifiers = []) => !modifiers.some(check.isStatic),
            callCheck: ({members: [fst, snd]}) => fst.name === 'a' && check.isNumber(fst.type)
                && snd.name === 'b' && check.isString(snd.type),
            parameterCheck: ({members: [fst]}) => fst.name === 'param' && check.isString(fst.type),
            returnTypeCheck: ({members: [fst, snd]}) => fst.name === 'a' && check.isNumber(fst.type)
                && snd.name === 'b' && check.isString(snd.type)
        })
    })

    test('Bound Returning External Type', async () => {
        const paths = await cds2ts('actions/model.cds', { outputDirectory: dir, inlineDeclarations: 'structured' })
        const astw = new ASTWrapper(path.join(paths[1], 'index.ts'))
        const actions = astw.getAspectProperty('_EAspect', 'actions')
        expect(actions.modifiers.some(check.isStatic)).toBeTruthy()
        checkFunction(actions.type.members.find(fn => fn.name === 'f'), {
            callCheck: signature => check.isAny(signature),
            parameterCheck: ({members: [fst]}) => fst.name === 'x' && check.isString(fst.type),
            returnTypeCheck: returns => check.isAny(returns)
        })

        checkFunction(actions.type.members.find(fn => fn.name === 'k'), {
            callCheck: ({full}) => full === '_elsewhere.ExternalType',
            returnTypeCheck: ({full}) => full === '_elsewhere.ExternalType'
        })

        checkFunction(actions.type.members.find(fn => fn.name === 'l'), {
            callCheck: ({full}) => full === '_.ExternalInRoot',
            returnTypeCheck: ({full}) => full === '_.ExternalInRoot'
        })
    })

    test('Unbound Returning External Type', async () => {
        const paths = await cds2ts('actions/model.cds', { outputDirectory: dir, inlineDeclarations: 'structured' })
        const ast = new ASTWrapper(path.join(paths[2], 'index.ts')).tree
        
        checkFunction(ast.find(node => node.name === 'free2'), {
            modifiersCheck: (modifiers = []) => !modifiers.some(check.isStatic),
            callCheck: ({full}) => full === '_elsewhere.ExternalType',
            returnTypeCheck: ({full}) => full === '_elsewhere.ExternalType'
        })

        checkFunction(ast.find(node => node.name === 'free3'), {
            modifiersCheck: (modifiers = []) => !modifiers.some(check.isStatic),
            callCheck: ({full}) => full === '_.ExternalInRoot',
            returnTypeCheck: ({full}) => full === '_.ExternalInRoot'
        })
    })

    test('Bound Expecting $self Arguments', async () => {
        const paths = await cds2ts('actions/model.cds', { outputDirectory: dir, inlineDeclarations: 'structured' })
        const astw = new ASTWrapper(path.join(paths[1], 'index.ts'))
        const actions = astw.getAspectProperty('_EAspect', 'actions')
        expect(actions.modifiers.some(check.isStatic)).toBeTruthy()
        

        // mainly make sure $self parameter is not present at all
        checkFunction(actions.type.members.find(fn => fn.name === 's1'), {
            callCheck: signature => check.isAny(signature),
            returnTypeCheck: returns => check.isAny(returns),
            parameterCheck: ({members}) => members.length === 0
        })
        checkFunction(actions.type.members.find(fn => fn.name === 'sn'), {
            callCheck: signature => check.isAny(signature),
            returnTypeCheck: returns => check.isAny(returns),
            parameterCheck: ({members}) => members.length === 0           
        })
        checkFunction(actions.type.members.find(fn => fn.name === 'sx'), {
            callCheck: signature => check.isAny(signature),
            returnTypeCheck: returns => check.isAny(returns),
            parameterCheck: ({members: [fst]}) => check.isNumber(fst.type)
        })
    })

})