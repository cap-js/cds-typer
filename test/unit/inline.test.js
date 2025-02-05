'use strict'

const { describe, it } = require('node:test')
const assert = require('assert')
const { check } = require('../ast')
const { locations, prepareUnitTest } = require('../util')

describe('Inline Type Declarations', () => {
    it('should verify structured inline type declarations', async () => {
        const astw = (await prepareUnitTest('inline/model.cds', locations.testOutput('inline_test_structured'))).astw
        assert.ok(astw.exists('_BarAspect', 'x', node => {
            const { name, type } = node
            const [nonNullType] = type.subtypes
            const [a, y] = nonNullType.members
            const [b, c] = a.type.subtypes[0].members
            return name === 'x'
                    && check.hasDeclareModifier(node)
                    && check.isNullable(type)
                    && nonNullType.members.length === 2
                    && a.name === 'a'
                    && check.isNullable(a.type)
                        && b.name === 'b'
                        && check.isNullable(b.type, [check.isNumber])
                        && c.name === 'c'
                        && check.isNullable(c.type, [t => t.nodeType === 'typeReference' && t.args[0].full === 'Foo'])
                    && y.name === 'y'
                    && check.isNullable(y.type, [check.isString])
        }))
    })

    it('should verify flat inline type declarations', async () => {
        const astw = (await prepareUnitTest(
            'inline/model.cds',
            locations.testOutput('inline_test_flat'),
            { typerOptions: { inlineDeclarations: 'flat' } }
        )).astw
        assert.ok(astw.exists('_BarAspect', 'x_a_b', node => check.hasDeclareModifier(node) && check.isNullable(node.type, [check.isNumber])))
        assert.ok(astw.exists('_BarAspect', 'x_y', node => check.hasDeclareModifier(node) && check.isNullable(node.type, [check.isString])))
        assert.ok(astw.exists('_BarAspect', 'x_a_c', node => check.hasDeclareModifier(node) && check.isNullable(node.type, [m => m.name === 'to' && m.args[0].full === 'Foo' ])))
    })
})