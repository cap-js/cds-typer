'use strict'

const path = require('path')
const { before, describe, it } = require('node:test')
const assert = require('assert')
const { locations, prepareUnitTest } = require('../util')
const { checkInheritance, checkDtsInheritance, JSASTWrapper } = require('../ast')
const { perEachTestConfig } = require('../config')
const { configuration } = require('../../lib/config')

perEachTestConfig(({ outputDTsFiles, outputFile }) => {
    describe(`CDS Aspects (using output **/*/${outputFile} files)`, () => {
        let astw

        before(async () => {
            configuration.outputDTsFiles = outputDTsFiles
            astw = (await prepareUnitTest('aspects/model.cds', locations.testOutput('aspect_test'))).astw
        })

        it('should validate aspect in singular form', () => {
            assert.ok(astw.tree.find(n => n.name === '_PersonAspect'))
        })

        it('should contain a composition to an aspect', () => {
            assert.ok(astw.exists('_CatalogAspect', 'persons'))
        })
    })

    // https://github.com/cap-js/cds-typer/issues/615
    describe(`Aspect Naming Collision (using output **/*/${outputFile} files)`, () => {
        let astw

        before(async () => {
            configuration.outputDTsFiles = outputDTsFiles
            astw = (await prepareUnitTest('aspects-collision/model.cds', locations.testOutput('aspects_collision_test'))).astw
        })

        it('should use entityName (_BooksAspect) for aspect with collision, not singular (_BookAspect)', () => {
            assert.ok(astw.tree.find(n => n.name === '_BooksAspect'), 'aspect function should be named _BooksAspect')
            assert.ok(!astw.tree.find(n => n.name === '_BookAspect'), 'aspect function should not be named _BookAspect in root')
        })

        it('should reference _BooksAspect (not _BookAspect) when extending the colliding aspect', () => {
            const eAspect = astw.getAspect('_EAspect')
            assert.ok(eAspect, '_EAspect function should exist in the AST')
            if (outputDTsFiles) {
                assert.ok(checkDtsInheritance(eAspect, ['_BooksAspect']))
                assert.ok(!checkDtsInheritance(eAspect, ['_BookAspect']), 'should not reference _BookAspect (premature inflection)')
            } else {
                assert.ok(checkInheritance(eAspect, ['_BooksAspect']))
                assert.ok(!checkInheritance(eAspect, ['_BookAspect']), 'should not reference _BookAspect (premature inflection)')
            }
        })
    })

    // https://github.com/cap-js/cds-typer/issues/19670
    describe(`Aspect inline enum JS output (using output **/*/${outputFile} files)`, () => {
        let paths

        before(async () => {
            configuration.outputDTsFiles = outputDTsFiles
            paths = (await prepareUnitTest('aspects/model_with_inline_enum.cds', locations.testOutput('aspect_inline_enum_test'), {
                typerOptions: { useEntitiesProxy: true }
            })).paths
        })

        it('should not emit JS assignments using the aspect singular name as LHS', async () => {
            // paths[1] is the namespace file (aspect_test), paths[0] is the _ boilerplate file
            const jsw = await JSASTWrapper.initialise(path.join(paths[1], 'index.js'))
            const allEnumExports = jsw.getExports().filter(e => e.type === 'enum')
            const brokenRefs = allEnumExports.filter(e => e.lhs.startsWith('Statu.') || e.lhs.startsWith('InlineStatu.'))
            assert.strictEqual(brokenRefs.length, 0, `Found broken aspect-name enum assignments: ${brokenRefs.map(e => e.lhs).join(', ')}`)
        })

        it('should emit JS enum assignments on the concrete entity', async () => {
            const jsw = await JSASTWrapper.initialise(path.join(paths[1], 'index.js'))
            assert.deepStrictEqual(jsw.getExport('Application.status')?.rhs, { Started: 'Started', Done: 'Done' })
            assert.deepStrictEqual(jsw.getExport('Application.inlineStatus')?.rhs, { Active: 'Active' })
        })
    })
})
