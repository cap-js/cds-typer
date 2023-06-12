'use strict'

const fs = require('fs').promises
const path = require('path')
const cds2ts = require('../../lib/compile')
const { ASTWrapper } = require('../ast')
const { locations } = require('../util')

const dir = locations.testOutput('output_test')

// compilation produces semantically complete Typescript
describe('Compilation', () => {
    //console.log('INFO', `Unable to unlink '${dir}' (${err}). This may not be an issue.`)
    beforeEach(() => fs.unlink(dir).catch(err => {}))

    let paths
    let ast

    describe('Bookshoplet', () => {

        beforeAll(async () => {
        paths = await cds2ts
            .compileFromFile(locations.unit.files('bookshoplet/model.cds'), {
                outputDirectory: dir,
            })
            // eslint-disable-next-line no-console
            .catch((err) => console.error(err))
            ast = new ASTWrapper(path.join(paths[1], 'index.ts'))
        })

        test('Generated Paths', () => expect(paths).toHaveLength(2)) // the one module [1] + baseDefinitions [0]
        
        test('Aspects', () => {
            const aspects = ast.getAspects()
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
            const fns = ast.getAspectFunctions()
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
            const fns = ast.getTopLevelClassDeclarations()
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
        let paths
        let ast

        beforeAll(async () => {
            paths = await cds2ts
                .compileFromFile(locations.unit.files('builtins/model.cds'), {
                    outputDirectory: dir,
                })
                // eslint-disable-next-line no-console
                .catch((err) => console.error(err))
                ast = new ASTWrapper(path.join(paths[1], 'index.ts'))
        })

        test('Primitives', () => {
            expect(ast.exists('_EAspect', 'uuid', m => m.type.keyword === 'string')).toBeTruthy()
            expect(ast.exists('_EAspect', 'str', m => m.type.keyword === 'string')).toBeTruthy()
            expect(ast.exists('_EAspect', 'bin', m => m.type.keyword === 'string')).toBeTruthy()
            expect(ast.exists('_EAspect', 'lstr', m => m.type.keyword === 'string')).toBeTruthy()
            expect(ast.exists('_EAspect', 'lbin', m => m.type.keyword === 'string')).toBeTruthy()
            expect(ast.exists('_EAspect', 'integ', m => m.type.keyword === 'number')).toBeTruthy()
            expect(ast.exists('_EAspect', 'uint8', m => m.type.keyword === 'number')).toBeTruthy()
            expect(ast.exists('_EAspect', 'int16', m => m.type.keyword === 'number')).toBeTruthy()
            expect(ast.exists('_EAspect', 'int32', m => m.type.keyword === 'number')).toBeTruthy()
            expect(ast.exists('_EAspect', 'int64', m => m.type.keyword === 'number')).toBeTruthy()
            expect(ast.exists('_EAspect', 'integer64', m => m.type.keyword === 'number')).toBeTruthy()
            expect(ast.exists('_EAspect', 'dec', m => m.type.keyword === 'number')).toBeTruthy()
            expect(ast.exists('_EAspect', 'doub', m => m.type.keyword === 'number')).toBeTruthy()
            expect(ast.exists('_EAspect', 'd', m => m.type.name === 'Date')).toBeTruthy()
            expect(ast.exists('_EAspect', 'dt', m => m.type.name === 'Date')).toBeTruthy()
            expect(ast.exists('_EAspect', 'ts', m => m.type.name === 'Date')).toBeTruthy()
        })
    })

    describe('Inflection', () => {
        let paths
        let ast

        beforeAll(async () => {
            paths = await cds2ts
                .compileFromFile(locations.unit.files('inflection/model.cds'), {
                    outputDirectory: dir,
                })
                // eslint-disable-next-line no-console
                .catch((err) => console.error(err))
                ast = new ASTWrapper(path.join(paths[1], 'index.ts'))
        })

        test('Generated Paths', () => expect(paths).toHaveLength(2)) // the one module [1] + baseDefinitions [0]
        
        test('Aspects', () => {
            const aspects = ast.getAspects()
            const expected = [
                '_GizmoAspect',
                '_FooSingularAspect',
                '_BarAspect',
                '_BazSingularAspect',
                '_AAspect',
                '_CAspect',
                '_OneSingleDAspect',
                '_RefererAspect',
            ]
            expect(aspects.length).toBe(expected.length)
            expect(aspects.map(({name}) => name)).toEqual(expect.arrayContaining(expected))
        })

        test('Classes', () => {
            const fns = ast.getTopLevelClassDeclarations()
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
                'Referer_'
            ]
            expect(fns.map(({name}) => name)).toEqual(expect.arrayContaining(expected))
            expect(fns.length).toBe(expected.length)
        })

        test('Annotated Assoc/ Comp', () => {
            expect(ast.exists('_RefererAspect', 'a', m => true
                    && m.type.name === 'to'
                    && m.type.args[0].name === 'BazSingular'
            )).toBeTruthy()
            expect(ast.exists('_RefererAspect', 'b', m => true
                    && m.type.name === 'many'
                    && m.type.args[0].name === 'BazPlural'
            )).toBeTruthy()
            expect(ast.exists('_RefererAspect', 'c', m => true
                    && m.type.name === 'of'
                    && m.type.args[0].name === 'BazSingular'
            )).toBeTruthy()
            expect(ast.exists('_RefererAspect', 'd', m => true
                    && m.type.name === 'many'
                    && m.type.args[0].name === 'BazPlural'
            )).toBeTruthy()
        })

        test('Inferred Assoc/ Comp', () => {
            expect(ast.exists('_RefererAspect', 'e', m => true
                    && m.type.name === 'to'
                    && m.type.args[0].name === 'Gizmo'
            )).toBeTruthy()
            expect(ast.exists('_RefererAspect', 'f', m => true
                    && m.type.name === 'many'
                    && m.type.args[0].name === 'Gizmos'
            )).toBeTruthy()
            expect(ast.exists('_RefererAspect', 'g', m => true
                    && m.type.name === 'of'
                    && m.type.args[0].name === 'Gizmo'
            )).toBeTruthy()
            expect(ast.exists('_RefererAspect', 'h', m => true
                    && m.type.name === 'many'
                    && m.type.args[0].name === 'Gizmos'
            )).toBeTruthy()
        })
    })
})
