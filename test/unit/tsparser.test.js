'use strict'

const { describe, it } = require('node:test')
const assert = require('assert')
const { ASTWrapper } = require('../ast')
const { locations } = require('../util')

const getWrapped = () => new ASTWrapper(locations.unit.files('typescript/foo.d.ts'))

describe('TypeScript AST Check', () => {
    it('should parse the TypeScript file', () => {
        const ast = getWrapped()
        assert.strictEqual(ast.getImports().length, 1)
        assert.strictEqual(ast.getTopLevelClassDeclarations().length, 2)
    })

    it('should check top-level class declarations', () => {
        const ast = getWrapped()
        const cls = ast.getTopLevelClassDeclarations().find(c => c.name === 'SomeSingularClass')
        assert.ok(cls)

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
            assert.ok(ast.exists('FooWithProperties', name, type))
        }
    })

    it('should check FooWithNestedTypes class', () => {
        const ast = getWrapped()
        const cls = ast.getAspects().find(c => c.name === 'FooWithNestedTypes')
        assert.ok(cls)
        assert.ok(ast.exists('FooWithNestedTypes', 'foo',
            m => m.name === 'foo'
                && m.type.members.length === 2
                && m.type.members[0].name === 'bar'
                    && m.type.members[0].type.members.length === 1
                    && m.type.members[0].type.members[0].name === 'baz'
                    && m.type.members[0].type.members[0].type.keyword === 'string'
                && m.type.members[1].name === 'qux'
                    && m.type.members[1].type.keyword === 'number'
        ))
    })

    it('should parse imports', () => {
        const ast = getWrapped()
        const { as, module } = ast.getImports()[0]
        assert.strictEqual(as, 'imp')
        assert.strictEqual(module, '../../../../a/b/c/')
    })
})
