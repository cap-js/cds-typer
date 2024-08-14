'use strict'

const path = require('path')
const { describe, test, expect } = require('@jest/globals')
const { Buffer, Path, SourceFile } = require('../../lib/file')

describe('Buffer', () => {
    const buffer = new Buffer(' ')
    test('No Indent', () => expect(buffer.currentIndent).toBe(''))
    test('One Indent', () => {
        buffer.indent()
        expect(buffer.currentIndent).toBe(' ')
    })
    test('Two Indent', () => {
        buffer.indent()
        expect(buffer.currentIndent).toBe('  ')
    })
    test('One Outdent', () => {
        buffer.outdent()
        expect(buffer.currentIndent).toBe(' ')
    })
    test('Two Outdent', () => {
        buffer.outdent()
        expect(buffer.currentIndent).toBe('')
    })
    test('Three Outdent', () => {
        expect(buffer.outdent).toThrow()
        expect(buffer.currentIndent).toBe('')
    })

    test('Add A', () => {
        buffer.add('A')
        expect(buffer.parts.length).toBe(1)
    })
    test('Add B', () => {
        buffer.add('B')
        expect(buffer.join('-')).toBe('A-B')
    })
    test('Clear', () => {
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
        expect(p.asDirectory({relative: 'a/b'})).toBe('./c')
        expect(p.asDirectory({relative: 'a/b/c/d/e'})).toBe('./../..')
        expect(p.asDirectory({relative: 'a/b/x/y'})).toBe('./../../c')
        expect(p.asDirectory({local: false})).toBe('a/b/c')
        expect(p.asDirectory({posix: false, local: false})).toBe(path.join('a','b','c'))
        expect(p.asDirectory({posix: false})).toBe('.' + path.sep + path.join('a','b','c'))
        p = new Path([])
        expect(p.asDirectory({local: false})).toBe('.')
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
        const impNo = sf.getImports().parts.length
        sf.addImport(new Path(['a', 'b']))
        expect(sf.getImports().parts.length).toBe(impNo+1)
        sf.addImport(new Path(['a', 'b']))
        expect(sf.getImports().parts.length).toBe(impNo+1)
        sf.addImport(new Path(['a', 'b', 'c']))
        expect(sf.getImports().parts.length).toBe(impNo+2)
        sf.addImport(new Path([]))
        expect(sf.getImports().parts.length).toBe(impNo+2)
    })
})
