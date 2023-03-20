'use strict'

const { toExactlyHave, TSParser } = require('../util')

expect.extend({ toExactlyHave })

const getParsed = () => new TSParser().parse('./__tests__/unit/files/typescript/foo.d.ts')

describe('TSParser', () => {
    test('parse', () => {
        const parsed = getParsed()
        expect(parsed).toExactlyHave(['namespaces', 'imports'])
        expect(Object.keys(parsed.namespaces).length).toBe(1)
        expect(Object.keys(parsed.imports).length).toBe(1)
    })

    test('parse FooWithProperties class', () => {
        const parsed = getParsed()
        const cls = parsed.namespaces.top.classes['FooWithProperties']

        expect(cls).toBeTruthy()
        const props = [
            ['foo', ['Foo']],
            ['aNumber', ['number']],
            ['manyNumbers', ['number[]']],
            ['text', ['string']],
            ['texts', ['ManyStrings']],
            ['gizmo', ['imp.Bar']],
            ['union', ['number', 'string']],
            ['intersection', ['number', 'string']],
            ['interunion', ['number', 'string', 'number[]']],
        ]
        expect(cls).toExactlyHave(props.map((p) => p[0]))

        for (const [name, type] of props) {
            expect(cls[name]).toStrictEqual(type)
        }
    })

    test('parse imports', () => {
        const parsed = getParsed()

        const { imports, alias, from } = parsed.imports[0]
        expect(imports).toBe('*')
        expect(alias).toBe('imp')
        expect(from).toBe('../../../../a/b/c/')
    })
})
