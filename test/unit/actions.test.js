'use strict'

const fs = require('fs').promises
const path = require('path')
const { ASTWrapper, checkFunction, type } = require('../ast')
const { locations, cds2ts } = require('../util')

const dir = locations.testOutput('actions_test')

describe('Actions', () => {
    beforeEach(async () => await fs.unlink(dir).catch(err => {}))

    test('Bound', async () => {
        const paths = await cds2ts('actions/model.cds', { outputDirectory: dir, inlineDeclarations: 'structured' })
        const astw = new ASTWrapper(path.join(paths[1], 'index.ts'))
        checkFunction(astw.getAspectProperty('_EAspect', 'f'), {
            parameterCheck: ({members: [fst]}) => fst.name === 'x' && type.isString(fst.type)
        })
        checkFunction(astw.getAspectProperty('_EAspect', 'g'), {
            parameterCheck: ({members: [fst, snd]}) => {
                const fstCorrect = fst.name === 'a' && fst.type.members[0].name === 'x' && type.isNumber(fst.type.members[0].type)
                    && fst.type.members[1].name === 'y' && type.isNumber(fst.type.members[1].type)
                const sndCorrect = snd.name === 'b' && type.isNumber(snd.type)
                return fstCorrect && sndCorrect
            }
        })
    })

    test('Unbound', async () => {
        const paths = await cds2ts('actions/model.cds', { outputDirectory: dir, inlineDeclarations: 'structured' })
        const ast = new ASTWrapper(path.join(paths[2], 'index.ts')).tree
        checkFunction(ast.find(node => node.name === 'free'), {
            callCheck: ({members: [fst, snd]}) => fst.name === 'a' && type.isNumber(fst.type)
                && snd.name === 'b' && type.isString(snd.type),
            parameterCheck: ({members: [fst]}) => fst.name === 'param' && type.isString(fst.type),
            returnTypeCheck: ({members: [fst, snd]}) => fst.name === 'a' && type.isNumber(fst.type)
                && snd.name === 'b' && type.isString(snd.type)
        })
    })

    test('Bound Returning External Type', async () => {
        const paths = await cds2ts('actions/model.cds', { outputDirectory: dir, inlineDeclarations: 'structured' })
        const astw = new ASTWrapper(path.join(paths[1], 'index.ts'))
        checkFunction(astw.getAspectProperty('_EAspect', 'f'), {
            callCheck: signature => type.isAny(signature),
            parameterCheck: ({members: [fst]}) => fst.name === 'x' && type.isString(fst.type),
            returnTypeCheck: returns => type.isAny(returns)
        })

        checkFunction(astw.getAspectProperty('_EAspect', 'k'), {
            callCheck: ({full}) => full === '_elsewhere.ExternalType',
            returnTypeCheck: ({full}) => full === '_elsewhere.ExternalType'
        })

        checkFunction(astw.getAspectProperty('_EAspect', 'l'), {
            callCheck: ({full}) => full === '_.ExternalInRoot',
            returnTypeCheck: ({full}) => full === '_.ExternalInRoot'
        })
    })

    test('Unbound Returning External Type', async () => {
        const paths = await cds2ts('actions/model.cds', { outputDirectory: dir, inlineDeclarations: 'structured' })
        const ast = new ASTWrapper(path.join(paths[2], 'index.ts')).tree
        
        checkFunction(ast.find(node => node.name === 'free2'), {
            callCheck: ({full}) => full === '_elsewhere.ExternalType',
            returnTypeCheck: ({full}) => full === '_elsewhere.ExternalType'
        })

        checkFunction(ast.find(node => node.name === 'free3'), {
            callCheck: ({full}) => full === '_.ExternalInRoot',
            returnTypeCheck: ({full}) => full === '_.ExternalInRoot'
        })
    })

    test('Bound Expecting $self Arguments', async () => {
        const paths = await cds2ts('actions/model.cds', { outputDirectory: dir, inlineDeclarations: 'structured' })
        const astw = new ASTWrapper(path.join(paths[1], 'index.ts'))
        // mainly make sure $self parameter is not present at all
        checkFunction(astw.getAspectProperty('_EAspect', 's1'), {
            callCheck: signature => type.isAny(signature),
            returnTypeCheck: returns => type.isAny(returns),
            parameterCheck: ({members}) => members.length === 0
        })
        checkFunction(astw.getAspectProperty('_EAspect', 'sn'), {
            callCheck: signature => type.isAny(signature),
            returnTypeCheck: returns => type.isAny(returns),
            parameterCheck: ({members}) => members.length === 0           
        })
        checkFunction(astw.getAspectProperty('_EAspect', 'sx'), {
            callCheck: signature => type.isAny(signature),
            returnTypeCheck: returns => type.isAny(returns),
            parameterCheck: ({members: [fst]}) => type.isNumber(fst.type)
        })
    })

})