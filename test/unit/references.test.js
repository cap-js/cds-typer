'use strict'

const { beforeAll, describe, test, expect } = require('@jest/globals')
const { check } = require('../ast')
const { locations, prepareUnitTest } = require('../util')

describe('References', () => {
    let astw

    beforeAll(async () => astw = (await prepareUnitTest('references/model.cds', locations.testOutput('references_test'))).astw)

    test('Entity', async () => {
        expect(astw.exists('_BarAspect', 'assoc_one', m => check.isNullable(m.type, [
            ({name, args}) => name === 'to' && args[0].name === 'Foo'
        ]))).toBeTruthy()
        expect(astw.exists('_BarAspect', 'assoc_many', m =>
            m.type.name === 'many'
                && m.type.args[0].name === 'Foo_'
        )).toBeTruthy()
        expect(astw.exists('_BarAspect', 'comp_one', m => check.isNullable(m.type, [
            ({name, args}) => name === 'of' && args[0].name === 'Foo'
        ]))).toBeTruthy()
        expect(astw.exists('_BarAspect', 'comp_many', m =>
            m.type.name === 'many'
                && m.type.args[0].name === 'Foo_'
        )).toBeTruthy()
        expect(astw.exists('_BarAspect', 'assoc_one_first_key', m => check.isNullable(m.type, [st => check.isKeyOf(st, check.isString)]))).toBeTruthy()
        expect(astw.exists('_BarAspect', 'assoc_one_second_key', m => check.isNullable(m.type, [st => check.isKeyOf(st, check.isString)]))).toBeTruthy()
        expect(astw.exists('_BarAspect', 'assoc_one_ID', m => check.isNullable(m.type, [st => check.isKeyOf(st, check.isString)]))).toBeTruthy()
    })

    test('Inline', async () => {
        expect(astw.exists('_BarAspect', 'inl_comp_one', m => {
            const comp = m.type.subtypes[0]
            const [a] = comp.args[0].members
            return check.isNullable(m.type)
                        && comp.name === 'of'
                        && a.name === 'a'
                        && check.isNullable(a.type, [check.isString])
        })).toBeTruthy()
        expect(astw.exists('_BarAspect', 'inl_comp_many', m => {
            const [arr] = m.type.args
            return m.type.name === 'many'
                && arr.name === 'Array'
                && arr.args[0].members[0].name === 'a'
                && check.isNullable(arr.args[0].members[0].type, [check.isString])
        })).toBeTruthy()
        // inline ID is not propagated into the parent entity
        expect(() => astw.exists('_BarAspect', 'inl_comp_one_ID')).toThrow(Error)
    })
})