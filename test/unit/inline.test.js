'use strict'

const { describe, it } = require('node:test')
const assert = require('assert')
const { check } = require('../ast')
const { locations, prepareUnitTest } = require('../util')
const { perEachTestConfig } = require('../config')
const { configuration } = require('../../lib/config')

perEachTestConfig(({ outputDTsFiles, outputFile }) => {
    describe(`Named Struct Type Declarations (using output **/*/${outputFile} files)`, () => {
        // Regression tests for https://github.com/cap-js/cds-typer/issues/347
        // Named struct types used as entity elements must be flattened in flat mode because
        // the CDS runtime (OData/SQL layer) exposes them as flat properties (e.g. author_firstName).
        // In structured mode they are referenced by their type name.

        it('should reference named struct type by name in structured mode', async () => {
            configuration.outputDTsFiles = outputDTsFiles
            const astw = (await prepareUnitTest(
                'inline/named-struct-model.cds',
                locations.testOutput('inline_named_struct_structured')
            )).astw
            // structured mode: author: Author  →  author?: Author | null
            assert.ok(astw.exists('_BookAspect', 'author', node =>
                (outputDTsFiles || check.hasDeclareModifier(node))
                && check.isNullable(node.type, [t => check.isTypeReference(t, 'Author')])
            ))
            // structured mode: ContentVersion: ContentVersionType  →  ContentVersion?: ContentVersionType | null
            assert.ok(astw.exists('_ContentItemAspect', 'ContentVersion', node =>
                (outputDTsFiles || check.hasDeclareModifier(node))
                && check.isNullable(node.type, [t => check.isTypeReference(t, 'ContentVersionType')])
            ))
        })

        it('should flatten named struct type in flat mode (issue #347)', async () => {
            configuration.outputDTsFiles = outputDTsFiles
            const astw = (await prepareUnitTest(
                'inline/named-struct-model.cds',
                locations.testOutput('inline_named_struct_flat'),
                { typerOptions: { inlineDeclarations: 'flat' } }
            )).astw
            // flat mode: author: Author  →  author_firstName, author_lastName (matching OData/SQL runtime)
            assert.ok(astw.exists('_BookAspect', 'author_firstName', node =>
                (outputDTsFiles || check.hasDeclareModifier(node))
                && check.isNullable(node.type, [check.isString])
            ))
            assert.ok(astw.exists('_BookAspect', 'author_lastName', node =>
                (outputDTsFiles || check.hasDeclareModifier(node))
                && check.isNullable(node.type, [check.isString])
            ))
            // flat mode: ContentVersion: ContentVersionType  →  ContentVersion_Development, ContentVersion_Production
            assert.ok(astw.exists('_ContentItemAspect', 'ContentVersion_Development', node =>
                (outputDTsFiles || check.hasDeclareModifier(node))
                && check.isNullable(node.type, [check.isString])
            ))
            assert.ok(astw.exists('_ContentItemAspect', 'ContentVersion_Production', node =>
                (outputDTsFiles || check.hasDeclareModifier(node))
                && check.isNullable(node.type, [check.isString])
            ))
        })

        it('should not produce a named type reference property in flat mode', async () => {
            configuration.outputDTsFiles = outputDTsFiles
            const astw = (await prepareUnitTest(
                'inline/named-struct-model.cds',
                locations.testOutput('inline_named_struct_flat_noref'),
                { typerOptions: { inlineDeclarations: 'flat' } }
            )).astw
            // flat mode must not emit the parent property pointing to the named type
            assert.throws(() => astw.exists('_BookAspect', 'author'), /does not feature a property/)
            assert.throws(() => astw.exists('_ContentItemAspect', 'ContentVersion'), /does not feature a property/)
        })
    })

    describe(`Inline Type Declarations (using output **/*/${outputFile} files)`, () => {
        it('should verify structured inline type declarations', async () => {
            configuration.outputDTsFiles = outputDTsFiles
            const astw = (await prepareUnitTest('inline/model.cds', locations.testOutput('inline_test_structured'))).astw
            assert.ok(astw.exists('_BarAspect', 'x', node => {
                const { name, type } = node
                const [nonNullType] = type.subtypes
                const [a, y] = nonNullType.members
                const [b, c] = a.type.subtypes[0].members
                return name === 'x'
                        && (outputDTsFiles || check.hasDeclareModifier(node))
                        && check.isNullable(type)
                        && nonNullType.members.length === 2
                        && a.name === 'a'
                        && check.isNullable(a.type)
                            && b.name === 'b'
                            && check.isNullable(b.type, [check.isNumber])
                            && c.name === 'c'
                            && check.isNullable(c.type, [t => t.nodeType === 'typeReference' && t.args[0].full === 'Foo'])
                        && y.name === 'y'
                        && check.isNullable(y.type, [check.isString])
            }))
        })

        it('should verify flat inline type declarations', async () => {
            configuration.outputDTsFiles = outputDTsFiles
            const astw = (await prepareUnitTest(
                'inline/model.cds',
                locations.testOutput('inline_test_flat'),
                { typerOptions: { inlineDeclarations: 'flat' } }
            )).astw
            assert.ok(astw.exists('_BarAspect', 'x_a_b', node => (outputDTsFiles || check.hasDeclareModifier(node)) && check.isNullable(node.type, [check.isNumber])))
            assert.ok(astw.exists('_BarAspect', 'x_y', node => (outputDTsFiles || check.hasDeclareModifier(node)) && check.isNullable(node.type, [check.isString])))
            assert.ok(astw.exists('_BarAspect', 'x_a_c', node => (outputDTsFiles || check.hasDeclareModifier(node)) && check.isNullable(node.type, [m => m.name === 'to' && m.args[0].full === 'Foo' ])))
        })
    })
})
