'use strict'

const { Buffer, Path, SourceFile } = require('../../lib/file')

describe('Buffer', () => {
    const buffer = new Buffer(' ')
    test('no indent', () => expect(buffer.currentIndent).toBe(''))
    test('one indent', () => {
        buffer.indent()
        expect(buffer.currentIndent).toBe(' ')
    })
    test('two indent', () => {
        buffer.indent()
        expect(buffer.currentIndent).toBe('  ')
    })
    test('one outdent', () => {
        buffer.outdent()
        expect(buffer.currentIndent).toBe(' ')
    })
    test('two outdent', () => {
        buffer.outdent()
        expect(buffer.currentIndent).toBe('')
    })
    test('three outdent', () => {
        expect(buffer.outdent).toThrow()
        expect(buffer.currentIndent).toBe('')
    })

    test('add A', () => {
        buffer.add('A')
        expect(buffer.parts.length).toBe(1)
    })
    test('add B', () => {
        buffer.add('B')
        expect(buffer.join('-')).toBe('A-B')
    })
    test('clear', () => {
        buffer.clear()
        expect(buffer.parts.length).toBe(0)
        expect(buffer.join()).toBe('')
    })
})

describe('Path', () => {
    test('asNamespace', () => {
        let p = new Path(['a', 'b', 'c'])
        expect(p.asNamespace()).toBe('a.b.c')
    })

    test('asIdentifier', () => {
        let p = new Path(['a', 'b', 'c'])
        expect(p.asIdentifier()).toBe('_a_b_c')
        p = new Path([])
        expect(p.asIdentifier()).toBe('_')
    })

    test('asDirectory', () => {
        let p = new Path(['a', 'b', 'c'])
        expect(p.asDirectory()).toBe('./a/b/c')
        expect(p.asDirectory('a/b')).toBe('./c')
        expect(p.asDirectory('a/b/c/d/e')).toBe('./../..')
        expect(p.asDirectory('a/b/x/y')).toBe('./../../c')
        expect(p.asDirectory(undefined, false)).toBe('a/b/c')
        p = new Path([])
        expect(p.asDirectory(undefined, false)).toBe('.')
    })

    test('isCwd', () => {
        let p = new Path(['a', 'b', 'c'])
        expect(p.isCwd()).toBe(false)
        expect(p.isCwd(p.asDirectory())).toBe(true)
        expect(p.isCwd('./a/b/c')).toBe(true)
        expect(p.isCwd('./x/y/z')).toBe(false)
        p = new Path([])
        expect(p.isCwd()).toBe(true)
        expect(p.isCwd(p.asDirectory())).toBe(true)
        expect(p.isCwd('./a/b/c')).toBe(false)
    })

    test('parent', () => {
        let p = new Path(['a', 'b', 'c'])
        expect(p.asNamespace()).toBe('a.b.c')
        p = p.getParent()
        expect(p.asNamespace()).toBe('a.b')
        p = p.getParent()
        expect(p.asNamespace()).toBe('a')
        p = p.getParent()
        expect(p.asNamespace()).toBe('')
        p = p.getParent()
        expect(p.asNamespace()).toBe('')
    })
})

describe('SourceFile', () => {
    test('addImport', () => {
        const sf = new SourceFile('.')
        sf.addImport(new Path(['a', 'b']))
        expect(sf.getImports().parts.length).toBe(1)
        sf.addImport(new Path(['a', 'b']))
        expect(sf.getImports().parts.length).toBe(1)
        sf.addImport(new Path(['a', 'b', 'c']))
        expect(sf.getImports().parts.length).toBe(2)
        sf.addImport(new Path([]))
        expect(sf.getImports().parts.length).toBe(2)
    })
})
