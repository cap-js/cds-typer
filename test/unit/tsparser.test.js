'use strict'

const { describe, test, expect } = require('@jest/globals')
const { ASTWrapper } = require('../ast')
const { locations } = require('../util')

const getWrapped = () => new ASTWrapper(locations.unit.files('typescript/foo.d.ts'))

describe('TS AST Check', () => {
    test('Parse', () => {
        const ast = getWrapped()
        expect(ast.getImports().length).toBe(1)
        expect(ast.getTopLevelClassDeclarations().length).toBe(2)
    })

    test('Check TopLevel Class', () => {
        const ast = getWrapped()
        const cls = ast.getTopLevelClassDeclarations().find(c => c.name === 'SomeSingularClass')
        expect(cls).toBeTruthy()

        const props = [
            ['foo', 'Foo'],
            ['aNumber', 'number'],
            ['manyNumbers', ({type: t}) => t.keyword === 'arraytype' 
                && t.elementType.keyword === 'number' 
            ],
            ['text', 'string'],
            ['texts', 'ManyStrings'],
            ['gizmo', ({type: t}) => t.full === 'imp.Bar'],
            ['intersection', ({type: t}) => t.keyword === 'intersectiontype'
                && t.subtypes
                && t.subtypes[0].keyword === 'number'
                && t.subtypes[1].keyword === 'string'
            ],
            ['union', ({type: t}) => t.keyword === 'uniontype'
                && t.subtypes
                && t.subtypes[0].keyword === 'number'
                && t.subtypes[1].keyword === 'string'
            ],
            ['interunion', ({type: t}) => t.keyword === 'uniontype'
                && t.subtypes[0].keyword === 'intersectiontype'
                && t.subtypes[1].keyword === 'arraytype'
                && t.subtypes[1].elementType.keyword === 'number'
                && t.subtypes[0].subtypes[0].keyword === 'number'
                && t.subtypes[0].subtypes[1].keyword === 'string'
            ],
        ]
        for (const [name, type] of props) {
            expect(ast.exists('FooWithProperties', name, type)).toBeTruthy()
        }
    })

    test('Check FooWithNestedTypes Class', () => {
        const ast = getWrapped()
        const cls = ast.getAspects().find(c => c.name === 'FooWithNestedTypes')
        expect(cls).toBeTruthy()
        expect(ast.exists('FooWithNestedTypes', 'foo', 
            m => m.name === 'foo'
                && m.type.members.length === 2
                && m.type.members[0].name === 'bar'
                    && m.type.members[0].type.members.length === 1
                    && m.type.members[0].type.members[0].name === 'baz'
                    && m.type.members[0].type.members[0].type.keyword === 'string'
                && m.type.members[1].name === 'qux'
                    && m.type.members[1].type.keyword === 'number'
        )).toBeTruthy()
    })

    test('Parse Imports', () => {
        const ast = getWrapped()
        const { as, module } = ast.getImports()[0]
        expect(as).toBe('imp')
        expect(module).toBe('../../../../a/b/c/')
    })
})
