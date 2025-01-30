'use strict'

const path = require('path')
const { describe, it } = require('node:test')
const assert = require('assert')
const { Buffer, Path, SourceFile } = require('../../lib/file')

describe('Buffer Tests', () => {
    const buffer = new Buffer(' ')
    it('should have no indent initially', () => assert.strictEqual(buffer.currentIndent, ''))
    it('should have one indent after indenting once', () => {
        buffer.indent()
        assert.strictEqual(buffer.currentIndent, ' ')
    })
    it('should have two indents after indenting twice', () => {
        buffer.indent()
        assert.strictEqual(buffer.currentIndent, '  ')
    })
    it('should have one indent after outdenting once', () => {
        buffer.outdent()
        assert.strictEqual(buffer.currentIndent, ' ')
    })
    it('should have no indent after outdenting twice', () => {
        buffer.outdent()
        assert.strictEqual(buffer.currentIndent, '')
    })
    it('should throw an error when outdenting below zero', () => {
        assert.throws(() => buffer.outdent())
        assert.strictEqual(buffer.currentIndent, '')
    })

    it('should add part A to the buffer', () => {
        buffer.add('A')
        assert.strictEqual(buffer.parts.length, 1)
    })
    it('should add part B to the buffer and join correctly', () => {
        buffer.add('B')
        assert.strictEqual(buffer.join('-'), 'A-B')
    })
    it('should clear the buffer', () => {
        buffer.clear()
        assert.strictEqual(buffer.parts.length, 0)
        assert.strictEqual(buffer.join(), '')
    })
})

describe('Path Tests', () => {
    it('should convert path to namespace', () => {
        let p = new Path(['a', 'b', 'c'])
        assert.strictEqual(p.asNamespace(), 'a.b.c')
    })

    it('should convert path to identifier', () => {
        let p = new Path(['a', 'b', 'c'])
        assert.strictEqual(p.asIdentifier(), '_a_b_c')
        p = new Path([])
        assert.strictEqual(p.asIdentifier(), '_')
    })

    it('should convert path to directory', () => {
        let p = new Path(['a', 'b', 'c'])
        assert.strictEqual(p.asDirectory(), './a/b/c')
        assert.strictEqual(p.asDirectory({relative: 'a/b'}), './c')
        assert.strictEqual(p.asDirectory({relative: 'a/b/c/d/e'}), './../..')
        assert.strictEqual(p.asDirectory({relative: 'a/b/x/y'}), './../../c')
        assert.strictEqual(p.asDirectory({local: false}), 'a/b/c')
        assert.strictEqual(p.asDirectory({posix: false, local: false}), path.join('a','b','c'))
        assert.strictEqual(p.asDirectory({posix: false}), '.' + path.sep + path.join('a','b','c'))
        p = new Path([])
        assert.strictEqual(p.asDirectory({local: false}), '.')
    })

    it('should check if path is current working directory', () => {
        let p = new Path(['a', 'b', 'c'])
        assert.strictEqual(p.isCwd(), false)
        assert.strictEqual(p.isCwd(p.asDirectory()), true)
        assert.strictEqual(p.isCwd('./a/b/c'), true)
        assert.strictEqual(p.isCwd('./x/y/z'), false)
        p = new Path([])
        assert.strictEqual(p.isCwd(), true)
        assert.strictEqual(p.isCwd(p.asDirectory()), true)
        assert.strictEqual(p.isCwd('./a/b/c'), false)
    })

    it('should get parent path', () => {
        let p = new Path(['a', 'b', 'c'])
        assert.strictEqual(p.asNamespace(), 'a.b.c')
        p = p.getParent()
        assert.strictEqual(p.asNamespace(), 'a.b')
        p = p.getParent()
        assert.strictEqual(p.asNamespace(), 'a')
        p = p.getParent()
        assert.strictEqual(p.asNamespace(), '')
        p = p.getParent()
        assert.strictEqual(p.asNamespace(), '')
    })
})

describe('SourceFile Tests', () => {
    it('should add imports correctly', () => {
        const sf = new SourceFile('.')
        const impNo = sf.getImports().parts.length
        sf.addImport(new Path(['a', 'b']))
        assert.strictEqual(sf.getImports().parts.length, impNo + 1)
        sf.addImport(new Path(['a', 'b']))
        assert.strictEqual(sf.getImports().parts.length, impNo + 1)
        sf.addImport(new Path(['a', 'b', 'c']))
        assert.strictEqual(sf.getImports().parts.length, impNo + 2)
        sf.addImport(new Path([]))
        assert.strictEqual(sf.getImports().parts.length, impNo + 2)
    })
})
