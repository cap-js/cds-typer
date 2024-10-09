'use strict'

const path = require('path')
const { beforeAll, describe, test, expect } = require('@jest/globals')
const { check, JSASTWrapper, checkFunction, ASTWrapper } = require('../ast')
const { locations, prepareUnitTest } = require('../util')

describe('Identifiers', () => {
    let astw

    beforeAll(async () => astw = (await prepareUnitTest('identifiers/model.cds', locations.testOutput('identifiers_test'))).astw)

    test('Delimited', () => {
        const x = astw
        console.log(x)
        /*
        const actions = astw.getAspectProperty('_FoobarAspect', 'actions')
        checkFunction(actions.type.members.find(fn => fn.name === 'f'), {
            parameterCheck: ({members: [fst]}) => fst.name === 'p'
                && check.isUnionType(fst.type, [
                    t => check.isLiteral(t, 'A'),
                    t => check.isLiteral(t, 'b'),
                ])
        })
                */
    })
})