'use strict'

const path = require('path')
const { beforeAll, describe, test, expect } = require('@jest/globals')
const { JSASTWrapper, check } = require('../ast')
const { locations, prepareUnitTest } = require('../util')

describe('Compilation', () => {
    let paths
    let astw

    describe('Bookshoplet', () => {

        beforeAll(async () => ({paths, astw} = await prepareUnitTest('bookshoplet/model.cds', locations.testOutput('output_test/bookshoplet'))))

        test('index.js', async () => {
            const jsw = await JSASTWrapper.initialise(path.join(paths[1], 'index.js'))
            jsw.exportsAre([
                ['Book', 'Books'],
                ['Books', 'Books'],
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

        test('Generated Paths', () => expect(paths).toHaveLength(2)) // the one module [1] + baseDefinitions [0]

        test('Aspects', () => {
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
            expect(aspects.length).toBe(expected.length)
            expect(aspects.map(({name}) => name)).toEqual(expect.arrayContaining(expected))
        })

        test('Aspect Functions', () => {
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
            expect(fns.length).toBe(expected.length)
            expect(fns.map(({name}) => name)).toEqual(expect.arrayContaining(expected))
        })

        test('Classes', () => {
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
            expect(fns.length).toBe(expected.length)
            expect(fns.map(({name}) => name)).toEqual(expect.arrayContaining(expected))
        })
    })

    describe('Builtin Types', () => {
        test('Primitives', async () => {
            const astw = (await prepareUnitTest('builtins/model.cds', locations.testOutput('output_test/builtin'))).astw
            expect(astw.exists('_EAspect', 'uuid', m => check.isNullable(m.type, [check.isString]))).toBeTruthy()
            expect(astw.exists('_EAspect', 'str', m => check.isNullable(m.type, [check.isString]))).toBeTruthy()
            expect(astw.exists('_EAspect', 'bin', m => check.isNullable(m.type, [check.isString]))).toBeTruthy()
            // expect(astw.exists('_EAspect', 'vec', m => check.isNullable(m.type, [check.isString]))).toBeTruthy()
            expect(astw.exists('_EAspect', 'lstr', m => check.isNullable(m.type, [check.isString]))).toBeTruthy()
            expect(astw.exists('_EAspect', 'lbin', m => check.isUnionType(m.type, [
                st => st.full === 'Buffer',
                check.isString
            ]))).toBeTruthy()
            expect(astw.exists('_EAspect', 'integ', m => check.isNullable(m.type, [check.isNumber]))).toBeTruthy()
            expect(astw.exists('_EAspect', 'uint8', m => check.isNullable(m.type, [check.isNumber]))).toBeTruthy()
            expect(astw.exists('_EAspect', 'int16', m => check.isNullable(m.type, [check.isNumber]))).toBeTruthy()
            expect(astw.exists('_EAspect', 'int32', m => check.isNullable(m.type, [check.isNumber]))).toBeTruthy()
            expect(astw.exists('_EAspect', 'int64', m => check.isNullable(m.type, [check.isNumber]))).toBeTruthy()
            expect(astw.exists('_EAspect', 'integer64', m => check.isNullable(m.type, [check.isNumber]))).toBeTruthy()
            expect(astw.exists('_EAspect', 'dec', m => check.isNullable(m.type, [check.isNumber]))).toBeTruthy()
            expect(astw.exists('_EAspect', 'doub', m => check.isNullable(m.type, [check.isNumber]))).toBeTruthy()
            expect(astw.exists('_EAspect', 'd', m => check.isNullable(m.type, [st => check.isTypeReference(st, '___.CdsDate')]))).toBeTruthy()
            expect(astw.exists('_EAspect', 't', m => check.isNullable(m.type, [st => check.isTypeReference(st, '___.CdsTime')]))).toBeTruthy()
            expect(astw.exists('_EAspect', 'dt', m => check.isNullable(m.type, [st => check.isTypeReference(st, '___.CdsDateTime')]))).toBeTruthy()
            expect(astw.exists('_EAspect', 'ts', m => check.isNullable(m.type, [st => check.isTypeReference(st, '___.CdsTimestamp')]))).toBeTruthy()
        })

        test('IEEE754', async () => {
            // nothing should change compared to the previous test, except for the type of 'dec' and 'doub'

            // (number | string)
            const ieee754 = m => check.isParenthesizedType(m, st => check.isUnionType(st, [check.isNumber, check.isString]))

            const astw = (await prepareUnitTest('builtins/model.cds', locations.testOutput('output_test/builtin'), {
                typerOptions: { IEEE754Compatible: true }
            })).astw
            expect(astw.exists('_EAspect', 'uuid', m => check.isNullable(m.type, [check.isString]))).toBeTruthy()
            expect(astw.exists('_EAspect', 'str', m => check.isNullable(m.type, [check.isString]))).toBeTruthy()
            expect(astw.exists('_EAspect', 'bin', m => check.isNullable(m.type, [check.isString]))).toBeTruthy()
            // expect(astw.exists('_EAspect', 'vec', m => check.isNullable(m.type, [check.isString]))).toBeTruthy()
            expect(astw.exists('_EAspect', 'lstr', m => check.isNullable(m.type, [check.isString]))).toBeTruthy()
            expect(astw.exists('_EAspect', 'lbin', m => check.isUnionType(m.type, [
                st => st.full === 'Buffer',
                check.isString
            ]))).toBeTruthy()
            expect(astw.exists('_EAspect', 'integ', m => check.isNullable(m.type, [check.isNumber]))).toBeTruthy()
            expect(astw.exists('_EAspect', 'uint8', m => check.isNullable(m.type, [check.isNumber]))).toBeTruthy()
            expect(astw.exists('_EAspect', 'int16', m => check.isNullable(m.type, [check.isNumber]))).toBeTruthy()
            expect(astw.exists('_EAspect', 'int32', m => check.isNullable(m.type, [check.isNumber]))).toBeTruthy()
            expect(astw.exists('_EAspect', 'int64', m => check.isNullable(m.type, [check.isNumber]))).toBeTruthy()
            expect(astw.exists('_EAspect', 'integer64', m => check.isNullable(m.type, [check.isNumber]))).toBeTruthy()
            expect(astw.exists('_EAspect', 'dec', m => check.isNullable(m.type, [ieee754]))).toBeTruthy()
            expect(astw.exists('_EAspect', 'doub', m => check.isNullable(m.type, [ieee754]))).toBeTruthy()
            expect(astw.exists('_EAspect', 'd', m => check.isNullable(m.type, [st => check.isTypeReference(st, '___.CdsDate')]))).toBeTruthy()
            expect(astw.exists('_EAspect', 't', m => check.isNullable(m.type, [st => check.isTypeReference(st, '___.CdsTime')]))).toBeTruthy()
            expect(astw.exists('_EAspect', 'dt', m => check.isNullable(m.type, [st => check.isTypeReference(st, '___.CdsDateTime')]))).toBeTruthy()
            expect(astw.exists('_EAspect', 'ts', m => check.isNullable(m.type, [st => check.isTypeReference(st, '___.CdsTimestamp')]))).toBeTruthy()
        })
    })

    describe('Inflection', () => {
        let paths
        let astw

        beforeAll(async () => ({paths, astw} = await prepareUnitTest('inflection/model.cds', locations.testOutput('output_test/inflection'))))


        test('Generated Paths', () => expect(paths).toHaveLength(2)) // the one module [1] + baseDefinitions [0]

        test('index.js', async () => {
            const jsw = await JSASTWrapper.initialise(path.join(paths[1], 'index.js'))
            jsw.exportsAre([
                ['Gizmo', 'Gizmos'],
                ['Gizmos', 'Gizmos'],
                ['FooSingular', 'Foos'],
                ['Foos', 'Foos'],
                ['Bar', 'Bars'],  // this one...
                ['BarPlural', 'Bars'],
                ['Bars', 'Bars'],
                ['BazSingular', 'Bazes'],
                ['BazPlural', 'Bazes'],
                ['Bazes', 'Bazes'],  // ...and this one...
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
            // ...are currently exceptions where both singular _and_ plural
            // are annotated and the original name is used as an export on top of that.
            // So _three_ exports per entity. If we ever choose to remove this third one,
            // then this test has to reflect that.
        })

        test('Aspects', () => {
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
            expect(aspects.length).toBe(expected.length)
            expect(aspects.map(({name}) => name)).toEqual(expect.arrayContaining(expected))
        })

        test('Classes', () => {
            const fns = astw.getTopLevelClassDeclarations()
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
                'D',
                'D',
                'Referer',
                'Referer_',
                'DSub',
                'DSub_',
                'CSub',
                'CSub_'
            ]
            expect(fns.map(({name}) => name)).toEqual(expect.arrayContaining(expected))
            expect(fns.length).toBe(expected.length)
        })

        test('Annotated Assoc/ Comp', () => {
            expect(astw.exists('_RefererAspect', 'a', m => check.isNullable(m.type, [
                ({name, args}) => name === 'to' && args[0].name === 'BazSingular'
            ]))).toBeTruthy()
            expect(astw.exists('_RefererAspect', 'b', m =>
                m.type.name === 'many'
                    && m.type.args[0].name === 'BazPlural'
            )).toBeTruthy()
            expect(astw.exists('_RefererAspect', 'c', m => check.isNullable(m.type, [
                ({name, args}) => name === 'of' && args[0].name === 'BazSingular'
            ]))).toBeTruthy()
            expect(astw.exists('_RefererAspect', 'd', m =>
                m.type.name === 'many'
                    && m.type.args[0].name === 'BazPlural'
            )).toBeTruthy()
        })

        test('Inferred Assoc/ Comp', () => {
            expect(astw.exists('_RefererAspect', 'e', m => check.isNullable(m.type, [
                ({name, args}) => name === 'to' && args[0].name === 'Gizmo'
            ]))).toBeTruthy()
            expect(astw.exists('_RefererAspect', 'f', m =>
                m.type.name === 'many'
                    && m.type.args[0].name === 'Gizmos'
            )).toBeTruthy()
            expect(astw.exists('_RefererAspect', 'g', m => check.isNullable(m.type, [
                ({name, args}) => name === 'of' && args[0].name === 'Gizmo'
            ]))).toBeTruthy()
            expect(astw.exists('_RefererAspect', 'h', m =>
                m.type.name === 'many'
                    && m.type.args[0].name === 'Gizmos'
            )).toBeTruthy()
        })
    })
})
