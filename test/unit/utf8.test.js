'use strict'

const { describe, it, before } = require('node:test')
const assert = require('assert')
const { check, checkFunction } = require('../ast')
const { locations, prepareUnitTest } = require('../util')

const dir = locations.testOutput('not_null_test')

describe('UTF8', () => {
    let astw

    before(async () => {
        astw = (await prepareUnitTest('utf8/model.cds', dir)).astw
    })

    describe('Properties', () => {
        it('should verify primitive property is not null', async () => {
            assert.ok(astw.getAspects().find(({name, members}) => name === '_EAspect'
            && members?.find(member => member.name === 'x' && !check.isNullable(member.type) && check.isNumber(member.type))))
        })
    })

    describe('Actions', () => {
        it('should verify bound action is not null', async () => {
            const actions = astw.getAspectProperty('_EAspect', 'actions')
            checkFunction(actions.type.members.find(fn => fn.name === 'f'), {
                parameterCheck: ({members: [fst]}) => fst.name === 'x' && !check.isNullable(fst.type)
            })
        })
    })
})
