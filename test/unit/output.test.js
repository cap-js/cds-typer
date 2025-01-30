'use strict'

const path = require('path')
const { before, describe, it } = require('node:test')
const assert = require('assert')
const { JSASTWrapper, check } = require('../ast')
const { locations, prepareUnitTest } = require('../util')

describe('Compilation Tests', () => {
    let paths
    let astw

    describe('Bookshoplet Tests', () => {

        before(async () => ({paths, astw} = await prepareUnitTest('bookshoplet/model.cds', locations.testOutput('output_test/bookshoplet'))))

        it('should verify exports in index.js', async () => {
            const jsw = await JSASTWrapper.initialise(path.join(paths[1], 'index.js'))
            jsw.exportsAre([
                ['Book', 'Books'],
                ['Books', 'Books'],
                ['Books.text', 'Books.texts'],
                ['Books.texts', 'Books.texts'],
                ['Author', 'Authors'],
                ['Authors', 'Authors'],
                ['Genre', 'Genres'],
                ['Genres', 'Genres'],
                ['A_', 'A'],
                ['A', 'A'],
                ['B_', 'B'],
                ['B', 'B'],
                ['C_', 'C'],
                ['C', 'C'],
                ['D_', 'D'],
                ['D', 'D'],
                ['E_', 'E'],
                ['E', 'E'],
                ['QueryEntity_', 'QueryEntity'],
                ['QueryEntity', 'QueryEntity']
            ])
        })

        it('should verify generated paths', () => assert.strictEqual(paths.length, 2))

        it('should verify aspects', () => {
            const aspects = astw.getAspects()
            const expected = [
                '_BookAspect',
                '_AuthorAspect',
                '_GenreAspect',
                '_AAspect',
                '_BAspect',
                '_CAspect',
                '_DAspect',
                '_EAspect',
                '_QueryEntityAspect',
            ]
            assert.strictEqual(aspects.length, expected.length)
            assert.deepStrictEqual(aspects.map(({name}) => name), expected)
        })

        it('should verify aspect functions', () => {
            const fns = astw.getAspectFunctions()
            const expected = [
                '_BookAspect',
                '_AuthorAspect',
                '_GenreAspect',
                '_AAspect',
                '_BAspect',
                '_CAspect',
                '_DAspect',
                '_EAspect',
                '_QueryEntityAspect',
            ]
            assert.strictEqual(fns.length, expected.length)
            assert.deepStrictEqual(fns.map(({name}) => name), expected)
        })

        it('should verify classes', () => {
            const fns = astw.getTopLevelClassDeclarations()
            const expected = [
                'Book',
                'Books',
                'Author',
                'Authors',
                'Genre',
                'Genres',
                'A',
                'A_',
                'B',
                'B_',
                'C',
                'C_',
                'D',
                'D_',
                'E',
                'E_',
                'QueryEntity',
                'QueryEntity_',
            ]
            assert.strictEqual(fns.length, expected.length)
            assert.deepStrictEqual(fns.map(({name}) => name), expected)
        })
    })

    describe('Builtin Types Tests', () => {
        it('should verify primitive types', async () => {
            const astw = (await prepareUnitTest('builtins/model.cds', locations.testOutput('output_test/builtin'))).astw
            assert.ok(astw.exists('_EAspect', 'uuid', m => check.isNullable(m.type, [check.isString])))
            assert.ok(astw.exists('_EAspect', 'str', m => check.isNullable(m.type, [check.isString])))
            assert.ok(astw.exists('_EAspect', 'bin', m => check.isNullable(m.type, [check.isString])))
            // assert.ok(astw.exists('_EAspect', 'vec', m => check.isNullable(m.type, [check.isString])))
            assert.ok(astw.exists('_EAspect', 'lstr', m => check.isNullable(m.type, [check.isString])))
            assert.ok(astw.exists('_EAspect', 'lbin', m => check.isUnionType(m.type, [
                st => st.full === 'Buffer',
                check.isString
            ])))
            assert.ok(astw.exists('_EAspect', 'integ', m => check.isNullable(m.type, [check.isNumber])))
            assert.ok(astw.exists('_EAspect', 'uint8', m => check.isNullable(m.type, [check.isNumber])))
            assert.ok(astw.exists('_EAspect', 'int16', m => check.isNullable(m.type, [check.isNumber])))
            assert.ok(astw.exists('_EAspect', 'int32', m => check.isNullable(m.type, [check.isNumber])))
            assert.ok(astw.exists('_EAspect', 'int64', m => check.isNullable(m.type, [check.isNumber])))
            assert.ok(astw.exists('_EAspect', 'integer64', m => check.isNullable(m.type, [check.isNumber])))
            assert.ok(astw.exists('_EAspect', 'dec', m => check.isNullable(m.type, [check.isNumber])))
            assert.ok(astw.exists('_EAspect', 'doub', m => check.isNullable(m.type, [check.isNumber])))
            assert.ok(astw.exists('_EAspect', 'd', m => check.isNullable(m.type, [st => check.isTypeReference(st, '___.CdsDate')])))
            assert.ok(astw.exists('_EAspect', 't', m => check.isNullable(m.type, [st => check.isTypeReference(st, '___.CdsTime')])))
            assert.ok(astw.exists('_EAspect', 'dt', m => check.isNullable(m.type, [st => check.isTypeReference(st, '___.CdsDateTime')])))
            assert.ok(astw.exists('_EAspect', 'ts', m => check.isNullable(m.type, [st => check.isTypeReference(st, '___.CdsTimestamp')])))
        })

        it('should verify IEEE754 types', async () => {
            const ieee754 = m => check.isParenthesizedType(m, st => check.isUnionType(st, [check.isNumber, check.isString]))

            const astw = (await prepareUnitTest('builtins/model.cds', locations.testOutput('output_test/builtin'), {
                typerOptions: { IEEE754Compatible: true }
            })).astw
            assert.ok(astw.exists('_EAspect', 'uuid', m => check.isNullable(m.type, [check.isString])))
            assert.ok(astw.exists('_EAspect', 'str', m => check.isNullable(m.type, [check.isString])))
            assert.ok(astw.exists('_EAspect', 'bin', m => check.isNullable(m.type, [check.isString])))
            // assert.ok(astw.exists('_EAspect', 'vec', m => check.isNullable(m.type, [check.isString])))
            assert.ok(astw.exists('_EAspect', 'lstr', m => check.isNullable(m.type, [check.isString])))
            assert.ok(astw.exists('_EAspect', 'lbin', m => check.isUnionType(m.type, [
                st => st.full === 'Buffer',
                check.isString
            ])))
            assert.ok(astw.exists('_EAspect', 'integ', m => check.isNullable(m.type, [check.isNumber])))
            assert.ok(astw.exists('_EAspect', 'uint8', m => check.isNullable(m.type, [check.isNumber])))
            assert.ok(astw.exists('_EAspect', 'int16', m => check.isNullable(m.type, [check.isNumber])))
            assert.ok(astw.exists('_EAspect', 'int32', m => check.isNullable(m.type, [check.isNumber])))
            assert.ok(astw.exists('_EAspect', 'int64', m => check.isNullable(m.type, [check.isNumber])))
            assert.ok(astw.exists('_EAspect', 'integer64', m => check.isNullable(m.type, [check.isNumber])))
            assert.ok(astw.exists('_EAspect', 'dec', m => check.isNullable(m.type, [ieee754])))
            assert.ok(astw.exists('_EAspect', 'doub', m => check.isNullable(m.type, [ieee754])))
            assert.ok(astw.exists('_EAspect', 'd', m => check.isNullable(m.type, [st => check.isTypeReference(st, '___.CdsDate')])))
            assert.ok(astw.exists('_EAspect', 't', m => check.isNullable(m.type, [st => check.isTypeReference(st, '___.CdsTime')])))
            assert.ok(astw.exists('_EAspect', 'dt', m => check.isNullable(m.type, [st => check.isTypeReference(st, '___.CdsDateTime')])))
            assert.ok(astw.exists('_EAspect', 'ts', m => check.isNullable(m.type, [st => check.isTypeReference(st, '___.CdsTimestamp')])))
        })
    })

    describe('Inflection Tests', () => {
        let paths
        let astw

        before(async () => ({paths, astw} = await prepareUnitTest('inflection/model.cds', locations.testOutput('output_test/inflection'))))

        it('should verify generated paths', () => assert.strictEqual(paths.length, 2))

        it('should verify exports in index.js', async () => {
            const jsw = await JSASTWrapper.initialise(path.join(paths[1], 'index.js'))
            jsw.exportsAre([
                ['Gizmo', 'Gizmos'],
                ['Gizmos', 'Gizmos'],
                ['FooSingular', 'Foos'],
                ['Foos', 'Foos'],
                ['Bar', 'Bars'],
                ['BarPlural', 'Bars'],
                ['Bars', 'Bars'],
                ['BazSingular', 'Bazes'],
                ['BazPlural', 'Bazes'],
                ['Bazes', 'Bazes'],
                ['A_', 'A'],
                ['A', 'A'],
                ['C', 'C'],
                ['CSub', 'CSub'],
                ['CSub_', 'CSub'],
                ['LotsOfCs', 'C'],
                ['OneSingleD', 'D'],
                ['D', 'D'],
                ['DSub', 'DSub'],
                ['DSub_', 'DSub'],
                ['Referer', 'Referer'],
                ['Referer_', 'Referer'],
            ])
        })

        it('should verify aspects', () => {
            const aspects = astw.getAspects()
            const expected = [
                '_GizmoAspect',
                '_FooSingularAspect',
                '_BarAspect',
                '_BazSingularAspect',
                '_AAspect',
                '_CAspect',
                '_OneSingleDAspect',
                '_RefererAspect',
                '_CSubAspect',
                '_DSubAspect'
            ]
            assert.strictEqual(aspects.length, expected.length)
            assert.deepStrictEqual(aspects.map(({name}) => name).sort(), expected.sort())
        })

        it('should verify classes', () => {
            const fns = astw.getTopLevelClassDeclarations().map(({name}) => name).sort()
            const expected = [
                'Gizmo',
                'Gizmos',
                'FooSingular',
                'Foos',
                'Bar',
                'BarPlural',
                'BazSingular',
                'BazPlural',
                'A',
                'A_',
                'C',
                'LotsOfCs',
                'OneSingleD',
                'D',
                'Referer',
                'Referer_',
                'DSub',
                'DSub_',
                'CSub',
                'CSub_'
            ].sort()
            assert.strictEqual(fns.length, expected.length)
            assert.deepStrictEqual(fns, expected.sort())
        })

        it('should verify annotated associations and compositions', () => {
            assert.ok(astw.exists('_RefererAspect', 'a', m => check.isNullable(m.type, [
                ({name, args}) => name === 'to' && args[0].name === 'BazSingular'
            ])))
            assert.ok(astw.exists('_RefererAspect', 'b', m =>
                m.type.name === 'many'
                    && m.type.args[0].name === 'BazPlural'
            ))
            assert.ok(astw.exists('_RefererAspect', 'c', m => check.isNullable(m.type, [
                ({name, args}) => name === 'of' && args[0].name === 'BazSingular'
            ])))
            assert.ok(astw.exists('_RefererAspect', 'd', m =>
                m.type.name === 'many'
                    && m.type.args[0].name === 'BazPlural'
            ))
        })

        it('should verify inferred associations and compositions', () => {
            assert.ok(astw.exists('_RefererAspect', 'e', m => check.isNullable(m.type, [
                ({name, args}) => name === 'to' && args[0].name === 'Gizmo'
            ])))
            assert.ok(astw.exists('_RefererAspect', 'f', m =>
                m.type.name === 'many'
                    && m.type.args[0].name === 'Gizmos'
            ))
            assert.ok(astw.exists('_RefererAspect', 'g', m => check.isNullable(m.type, [
                ({name, args}) => name === 'of' && args[0].name === 'Gizmo'
            ])))
            assert.ok(astw.exists('_RefererAspect', 'h', m =>
                m.type.name === 'many'
                    && m.type.args[0].name === 'Gizmos'
            ))
        })
    })
})
