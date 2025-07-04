'use strict'

const path = require('path')
const { describe, before, it } = require('node:test')
const assert = require('assert')
const { checkFunction, check, ASTWrapper, checkKeyword } = require('../ast')
const { locations, prepareUnitTest } = require('../util')

describe('Actions', () => {
    let paths
    let sut
    let astwBound
    let astwUnbound

    before(async () => {
        sut = await prepareUnitTest('actions/model.cds', locations.testOutput('actions_test'))
        paths = sut.paths
        astwBound = new ASTWrapper(path.join(paths.find(p => p.endsWith('S')), 'index.ts'))
        astwUnbound = new ASTWrapper(path.join(paths.find(p => p.endsWith('actions_test')), 'index.ts'))
    })

    it('should add import statement for builtin types', async () => {
        assert.strictEqual(sut.astw.getImports()[0].module, './../_')
    })

    it('should validate bound actions', async () => {
        const actions = astwBound.getAspectProperty('_EAspect', 'actions')
        assert.ok(actions.modifiers.some(check.isStatic))
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

    it('should validate unbound actions', async () => {
        const ast = astwUnbound.tree
        checkFunction(ast.find(node => node.name === 'free'), {
            modifiersCheck: (modifiers = []) => !modifiers.some(check.isStatic),
            callCheck: type => check.isNullable(type.subtypes[0].args[0])
                && type.subtypes[0].args[0].subtypes[0].members[0].name === 'a'
                && check.isNullable(type.subtypes[0].args[0].subtypes[0].members[0].type, [check.isNumber])
                && type.subtypes[0].args[0].subtypes[0].members[1].name === 'b'
                && check.isNullable(type.subtypes[0].args[0].subtypes[0].members[1].type, [check.isString]),
            parameterCheck: ({members: [fst]}) => fst.name === 'param' && check.isNullable(fst.type, [check.isString]),
            returnTypeCheck: type => check.isNullable(type.subtypes[0].args[0])
                && type.subtypes[0].args[0].subtypes[0].members[0].name === 'a'
                && check.isNullable(type.subtypes[0].args[0].subtypes[0].members[0].type, [check.isNumber])
                && type.subtypes[0].args[0].subtypes[0].members[1].name === 'b'
                && check.isNullable(type.subtypes[0].args[0].subtypes[0].members[1].type, [check.isString]),
            // unbound actions -> self === null
            selfTypeCheck: check.isNull
        })
    })

    it('should validate bound actions containing __self', async () => {
        const actions = astwBound.getAspectProperty('_EAspect', 'actions')
        assert.ok(actions.modifiers.some(check.isStatic))
        checkFunction(actions.type.members.find(fn => fn.name === 'f'), {
            selfTypeCheck: type => check.isTypeReference(type, 'E')
        })

        checkFunction(actions.type.members.find(fn => fn.name === 'k'), {
            selfTypeCheck: type => check.isTypeReference(type, 'E')
        })

        checkFunction(actions.type.members.find(fn => fn.name === 'l'), {
            selfTypeCheck: type => check.isTypeReference(type, 'E')
        })
    })


    it('should validate bound actions returning external type', async () => {
        const actions = astwBound.getAspectProperty('_EAspect', 'actions')
        assert.ok(actions.modifiers.some(check.isStatic))
        checkFunction(actions.type.members.find(fn => fn.name === 'f'), {
            callCheck: signature => check.isAny(signature),
            parameterCheck: ({members: [fst]}) => fst.name === 'x' && check.isNullable(fst.type, [check.isString]),
            returnTypeCheck: returns => check.isAny(returns),
        })

        checkFunction(actions.type.members.find(fn => fn.name === 'k'), {
            callCheck: ({full}) => full === '_elsewhere.ExternalType',
            returnTypeCheck: ({full}) => full === '_elsewhere.ExternalType',
        })

        checkFunction(actions.type.members.find(fn => fn.name === 'l'), {
            callCheck: ({full}) => full === '_.ExternalInRoot',
            returnTypeCheck: ({full}) => full === '_.ExternalInRoot',
        })
    })

    it('should validate unbound actions returning external type', async () => {
        const ast = astwUnbound.tree

        checkFunction(ast.find(node => node.name === 'free2'), {
            modifiersCheck: (modifiers = []) => !modifiers.some(check.isStatic),
            callCheck: type => check.isNullable(type.subtypes[0].args[0], [t => t?.full === '_elsewhere.ExternalType']),
            returnTypeCheck: type => check.isNullable(type.subtypes[0].args[0], [t => t?.full === '_elsewhere.ExternalType'])
        })

        checkFunction(ast.find(node => node.name === 'free3'), {
            modifiersCheck: (modifiers = []) => !modifiers.some(check.isStatic),
            callCheck: type => check.isNullable(type.subtypes[0].args[0], [t => t?.full === '_.ExternalInRoot']),
            returnTypeCheck: type => check.isNullable(type.subtypes[0].args[0], [t => t?.full === '_.ExternalInRoot'])
        })
    })

    it('should validate void action returning void', async () => {
        checkFunction(astwUnbound.tree.find(node => node.name === 'freevoid'), {
            modifiersCheck: (modifiers = []) => !modifiers.some(check.isStatic),
            callCheck: type => check.isNullable(type, [check.isVoid]),
            returnTypeCheck: type => check.isNullable(type, [check.isVoid])
        })
    })

    it('should validate bound actions expecting $self arguments', async () => {
        const actions = astwBound.getAspectProperty('_EAspect', 'actions')
        assert.ok(actions.modifiers.some(check.isStatic))
        // mainly make sure $self parameter is not present at all
        checkFunction(actions.type.members.find(fn => fn.name === 's1'), {
            callCheck: signature => check.isAny(signature),
            returnTypeCheck: returns => check.isAny(returns),
            parameterCheck: ({full, args}) => full === 'globalThis.Record'
                && checkKeyword(args[0], 'never')
                && checkKeyword(args[1], 'never')
        })
        checkFunction(actions.type.members.find(fn => fn.name === 'sn'), {
            callCheck: signature => check.isAny(signature),
            returnTypeCheck: returns => check.isAny(returns),
            parameterCheck: ({full, args}) => full === 'globalThis.Record'
                && checkKeyword(args[0], 'never')
                && checkKeyword(args[1], 'never')
        })
        checkFunction(actions.type.members.find(fn => fn.name === 'sx'), {
            callCheck: signature => check.isAny(signature),
            returnTypeCheck: returns => check.isAny(returns),
            parameterCheck: ({members: [fst]}) => check.isNullable(fst.type, [check.isNumber])
        })
    })

    it('should validate inflection on external type in function type', async () => {
        checkFunction(astwBound.tree.find(fn => fn.name === 'getOneExternalType'), {
            returnTypeCheck: returns => check.isNullable(returns.subtypes[0].args[0], [st => check.isTypeReference(st, '_elsewhere.ExternalType')])
        })
        checkFunction(astwBound.tree.find(fn => fn.name === 'getManyExternalTypes'), {
            returnTypeCheck: returns => check.isArray(returns.subtypes[0].args[0], ([arg]) => check.isTypeReference(arg, '_elsewhere.ExternalType'))
        })
    })

    it('should validate inflection in parameters/return type of functions', async () => {
        checkFunction(astwBound.tree.find(fn => fn.name === 'fSingleParamSingleReturn'), {
            parameterCheck: ({members: [fst]}) => check.isNullable(fst.type, [arg => check.isTypeReference(arg, 'E')]),
            returnTypeCheck: returns => check.isNullable(returns.subtypes[0].args[0], [st => check.isTypeReference(st, 'E')])
        })
        checkFunction(astwBound.tree.find(fn => fn.name === 'fSingleParamManyReturn'), {
            parameterCheck: ({members: [fst]}) => check.isNullable(fst.type, [arg => check.isTypeReference(arg, 'E')]),
            returnTypeCheck: returns => check.isArray(returns.subtypes[0].args[0], ([arg]) => check.isTypeReference(arg, 'E'))
        })
        checkFunction(astwBound.tree.find(fn => fn.name === 'fManyParamSingleReturn'), {
            parameterCheck: ({members: [fst]}) => check.isArray(fst.type, ([arg]) => check.isTypeReference(arg, 'E')),
            returnTypeCheck: returns => check.isNullable(returns.subtypes[0].args[0], [st => check.isTypeReference(st, 'E')])
        })
        checkFunction(astwBound.tree.find(fn => fn.name === 'fManyParamSingleReturn'), {
            parameterCheck: ({members: [fst]}) => check.isArray(fst.type, ([arg]) => check.isTypeReference(arg, 'E')),
            returnTypeCheck: returns => check.isNullable(returns.subtypes[0].args[0], [st => check.isTypeReference(st, 'E')])
        })
        checkFunction(astwBound.tree.find(fn => fn.name === 'fManyParamManyReturn'), {
            parameterCheck: ({members: [fst]}) => check.isArray(fst.type, ([arg]) => check.isTypeReference(arg, 'E')),
            returnTypeCheck: returns => check.isArray(returns.subtypes[0].args[0], ([arg]) => check.isTypeReference(arg, 'E'))
        })
    })

    it('should validate inflection in parameters/return type of actions', async () => {
        checkFunction(astwBound.tree.find(fn => fn.name === 'aSingleParamSingleReturn'), {
            parameterCheck: ({members: [fst]}) => check.isNullable(fst.type, [arg => check.isTypeReference(arg, 'E')]),
            returnTypeCheck: returns => check.isNullable(returns.subtypes[0].args[0], [st => check.isTypeReference(st, 'E')])
        })
        checkFunction(astwBound.tree.find(fn => fn.name === 'aSingleParamManyReturn'), {
            parameterCheck: ({members: [fst]}) => check.isNullable(fst.type, [arg => check.isTypeReference(arg, 'E')]),
            returnTypeCheck: returns => check.isArray(returns.subtypes[0].args[0], ([arg]) => check.isTypeReference(arg, 'E'))
        })
        checkFunction(astwBound.tree.find(fn => fn.name === 'aManyParamSingleReturn'), {
            parameterCheck: ({members: [fst]}) => check.isArray(fst.type, ([arg]) => check.isTypeReference(arg, 'E')),
            returnTypeCheck: returns => check.isNullable(returns.subtypes[0].args[0], [st => check.isTypeReference(st, 'E')])
        })
        checkFunction(astwBound.tree.find(fn => fn.name === 'aManyParamSingleReturn'), {
            parameterCheck: ({members: [fst]}) => check.isArray(fst.type, ([arg]) => check.isTypeReference(arg, 'E')),
            returnTypeCheck: returns => check.isNullable(returns.subtypes[0].args[0], [st => check.isTypeReference(st, 'E')])
        })
        checkFunction(astwBound.tree.find(fn => fn.name === 'aManyParamManyReturn'), {
            parameterCheck: ({members: [fst]}) => check.isArray(fst.type, ([arg]) => check.isTypeReference(arg, 'E')),
            returnTypeCheck: returns => check.isArray(returns.subtypes[0].args[0], ([arg]) => check.isTypeReference(arg, 'E'))
        })
    })

    it('should validate optional action params', async () => {
        checkFunction(astwBound.tree.find(fn => fn.name === 'aMandatoryParam'), {
            parameterCheck: ({members: [p1, p2, p3]}) => !check.isOptional(p1) && !check.isOptional(p2) && check.isOptional(p3),
        })
    })

    it('should validate empty .actions typed as empty Record', async () => {
        const { type } = astwUnbound.getAspectProperty('_NoActionAspect', 'actions')
        assert.strictEqual(type.full, 'globalThis.Record')
        assert.ok(checkKeyword(type.args[0], 'never'))
        assert.ok(checkKeyword(type.args[1], 'never'))
    })

    it('should validate typeof parameter referring to correct type', async () => {
        checkFunction(astwUnbound.tree.find(node => node.name === 'freetypeof'), {
            modifiersCheck: (modifiers = []) => !modifiers.some(check.isStatic),
            callCheck: type => check.isNullable(type, [check.isVoid]),
            returnTypeCheck: type => check.isNullable(type, [check.isVoid]),
            parameterCheck: ({members: [fst]}) => check.isNullable(fst.type, [check.isIndexedAccessType])
        })
    })

    it('should validate mandatory parameters to not be null or undefined', async () => {
        checkFunction(astwUnbound.tree.find(node => node.name === 'actionWithMandatoryParameter'), {
            parameterCheck: ({members: [fst]}) => !check.isNullable(fst.type)
        })
    })
})
