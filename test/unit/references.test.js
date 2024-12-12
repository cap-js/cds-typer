'use strict'

const { beforeAll, describe, test, expect } = require('@jest/globals')
const { check } = require('../ast')
const { locations, prepareUnitTest } = require('../util')

describe('References', () => {
    /** @type {import('../ast').ASTWrapper} */
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
        expect(astw.exists('_BarAspect', 'assoc_one_first_key', m => check.isNullable(m.type, [st => check.isString(st)]))).toBeTruthy()
        expect(astw.exists('_BarAspect', 'assoc_one_second_key', m => check.isNullable(m.type, [st => check.isString(st)]))).toBeTruthy()
        expect(astw.exists('_BarAspect', 'assoc_one_ID', m => check.isNullable(m.type, [st => check.isString(st)]))).toBeTruthy()
    })

    test('Inline', async () => {
        expect(astw.exists('_BarAspect', 'inl_comp_one', m => {
            const comp = m.type.subtypes[0]
            const type = comp.args[0]
            return check.isNullable(m.type)
                        && comp.name === 'of'
                        && type.full === 'Bar.inl_comp_one'
        })).toBeTruthy()
        expect(astw.exists('Bar._inl_comp_oneAspect', 'a', m => check.isNullable(m.type))).toBeTruthy()
        expect(astw.exists('Bar._inl_comp_oneAspect', 'ID', m => check.isKeyOf(m.type, check.isString))).toBeTruthy()
        expect(astw.exists('Bar._inl_comp_oneAspect', 'up__id', m => check.isKeyOf(m.type, check.isNumber))).toBeTruthy()
        expect(astw.exists('_BarAspect', 'inl_comp_many', m => {
            const [arr] = m.type.args
            return m.type.name === 'many' && arr.full === 'Bar.inl_comp_many_'
        })).toBeTruthy()
        expect(astw.exists('Bar._inl_comp_manyAspect', 'a', m => check.isNullable(m.type))).toBeTruthy()
        expect(astw.exists('Bar._inl_comp_manyAspect', 'up__id', m => check.isKeyOf(m.type, check.isNumber))).toBeTruthy()

        // inline ID is not propagated into the parent entity
        expect(() => astw.exists('_BarAspect', 'inl_comp_one_ID')).toThrow(Error)
    })
})