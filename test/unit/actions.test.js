'use strict'

const path = require('path')

const { checkFunction, check, ASTWrapper } = require('../ast')
const { locations, prepareUnitTest } = require('../util')

describe('Actions', () => {
    let paths
    let astwBound
    let astwUnbound

    beforeAll(async () => {
        paths = (await prepareUnitTest('actions/model.cds', locations.testOutput('actions_test'))).paths
        astwBound = new ASTWrapper(path.join(paths[1], 'index.ts'))
        astwUnbound = new ASTWrapper(path.join(paths[2], 'index.ts'))
    })

    test('Bound', async () => {
        const actions = astwBound.getAspectProperty('_EAspect', 'actions')
        expect(actions.modifiers.some(check.isStatic)).toBeTruthy()
        checkFunction(actions.type.members.find(fn => fn.name === 'f'), {
            parameterCheck: ({members: [fst]}) => fst.name === 'x' && check.isNullable(fst.type, [check.isString])
        })
        checkFunction(actions.type.members.find(fn => fn.name === 'g'), {
            parameterCheck: ({members: [fst, snd]}) => {
                const fstCorrect = fst.name === 'a' 
                    && fst.type.subtypes[0].members[0].name === 'x' 
                    && check.isNullable(fst.type.subtypes[0].members[0].type, [check.isNumber])
                    && fst.type.subtypes[0].members[1].name === 'y' && check.isNullable(fst.type.subtypes[0].members[1].type, [check.isNumber])
                const sndCorrect = snd.name === 'b' && check.isNullable(snd.type, [check.isNumber])
                return fstCorrect && sndCorrect
            }
        })
    })

    test('Unbound', async () => {
        const ast = astwUnbound.tree
        checkFunction(ast.find(node => node.name === 'free'), {
            modifiersCheck: (modifiers = []) => !modifiers.some(check.isStatic),
            callCheck: type => check.isNullable(type) 
                && type.subtypes[0].members[0].name === 'a'
                && check.isNullable(type.subtypes[0].members[0].type, [check.isNumber])
                && type.subtypes[0].members[1].name === 'b'
                && check.isNullable(type.subtypes[0].members[1].type, [check.isString]),
            parameterCheck: ({members: [fst]}) => fst.name === 'param' && check.isNullable(fst.type, [check.isString]),
            returnTypeCheck: type => check.isNullable(type) 
                && type.subtypes[0].members[0].name === 'a'
                && check.isNullable(type.subtypes[0].members[0].type, [check.isNumber])
                && type.subtypes[0].members[1].name === 'b'
                && check.isNullable(type.subtypes[0].members[1].type, [check.isString]),
        })
    })

    test('Bound Returning External Type', async () => {
        const actions = astwBound.getAspectProperty('_EAspect', 'actions')
        expect(actions.modifiers.some(check.isStatic)).toBeTruthy()
        checkFunction(actions.type.members.find(fn => fn.name === 'f'), {
            callCheck: signature => check.isAny(signature),
            parameterCheck: ({members: [fst]}) => fst.name === 'x' && check.isNullable(fst.type, [check.isString]),
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
        const ast = astwUnbound.tree
        
        checkFunction(ast.find(node => node.name === 'free2'), {
            modifiersCheck: (modifiers = []) => !modifiers.some(check.isStatic),
            callCheck: type => check.isNullable(type, [t => t?.full === '_elsewhere.ExternalType']),
            returnTypeCheck: type => check.isNullable(type, [t => t?.full === '_elsewhere.ExternalType'])
        })

        checkFunction(ast.find(node => node.name === 'free3'), {
            modifiersCheck: (modifiers = []) => !modifiers.some(check.isStatic),
            callCheck: type => check.isNullable(type, [t => t?.full === '_.ExternalInRoot']),
            returnTypeCheck: type => check.isNullable(type, [t => t?.full === '_.ExternalInRoot'])
        })
    })

    test('Bound Expecting $self Arguments', async () => {
        const actions = astwBound.getAspectProperty('_EAspect', 'actions')
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
            parameterCheck: ({members: [fst]}) => check.isNullable(fst.type, [check.isNumber])
        })
    })

})