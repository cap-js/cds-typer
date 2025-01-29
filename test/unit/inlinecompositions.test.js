'use strict'

const path = require('path')
const { describe, it } = require('node:test')
const assert = require('assert')
const { JSASTWrapper } = require('../ast')
const { locations, prepareUnitTest } = require('../util')

/**
 * @typedef {import('../ast').JSASTWrapper} JSASTWrapper
 */

describe('Inline compositions', () => {

    it('should test exports with entities proxy', async () => {
        const paths = (
            await prepareUnitTest('inlinecompositions/model.cds', locations.testOutput('inlinecompositions_test'), {
                typerOptions: { useEntitiesProxy: true },
            })
        ).paths
        const jsw = await JSASTWrapper.initialise(
            path.join(paths[1], 'index.js'),
            true
        )
        jsw.exportsAre([
            ['Genre', 'Genres'],
            ['Genres', 'Genres'],
            ['Bestseller', 'Books'],
            ['Bestsellers', 'Books'],
            ['Books', 'Books'],
            ['Genres.text', 'Genres.texts'],
            ['Genres.texts', 'Genres.texts'],
            ['Books.publisher', 'Books.publishers'],
            ['Books.publishers', 'Books.publishers'],
            ['Books.publishers.PEditor', 'Books.publishers.intEditors'],
            ['Books.publishers.PEditors', 'Books.publishers.intEditors'],
            ['Books.publishers.intEditors', 'Books.publishers.intEditors'],
            ['Books.publishers.EEditor', 'Books.publishers.extEditors'],
            ['Books.publishers.EEditors', 'Books.publishers.extEditors'],
            ['Books.publishers.extEditors', 'Books.publishers.extEditors'],
            ['Books.publishers.office', 'Books.publishers.offices'],
            ['Books.publishers.offices', 'Books.publishers.offices'],
        ])
        assert.deepStrictEqual(jsw.getExport('Genre.code').rhs, { Fiction: 'Fiction' })
        assert.deepStrictEqual(jsw.getExport('Genres.text.code')?.rhs, { Fiction: 'Fiction' })
        assert.deepStrictEqual(jsw.getExport('Books.publisher.type')?.rhs, { self: 'self', independent: 'independent' })
        assert.deepStrictEqual(jsw.getExport('Books.publishers.office.size')?.rhs, {
            small: 'small',
            medium: 'medium',
            large: 'large',
        })

        jsw.hasProxyExport('Genres.text', ['code'])
        jsw.hasProxyExport('Books.publisher', ['type'])
        jsw.hasProxyExport('Books.publishers.office', ['size'])
    })

    it('should test exports with direct csn export', async () => {
        const paths = (
            await prepareUnitTest('inlinecompositions/model.cds', locations.testOutput('inlinecompositions_test'), {
                typerOptions: {},
            })
        ).paths
        const jsw = await JSASTWrapper.initialise(
            path.join(paths[1], 'index.js'),
            false
        )
        jsw.exportsAre([
            ['Genre', 'Genres'],
            ['Genres', 'Genres'],
            ['Bestseller', 'Books'],
            ['Bestsellers', 'Books'],
            ['Books', 'Books'],
            ['Genres.text', 'Genres.texts'],
            ['Genres.texts', 'Genres.texts'],
            ['Books.publisher', 'Books.publishers'],
            ['Books.publishers', 'Books.publishers'],
            ['Books.publishers.PEditor', 'Books.publishers.intEditors'],
            ['Books.publishers.PEditors', 'Books.publishers.intEditors'],
            ['Books.publishers.intEditors', 'Books.publishers.intEditors'],
            ['Books.publishers.EEditor', 'Books.publishers.extEditors'],
            ['Books.publishers.EEditors', 'Books.publishers.extEditors'],
            ['Books.publishers.extEditors', 'Books.publishers.extEditors'],
            ['Books.publishers.office', 'Books.publishers.offices'],
            ['Books.publishers.offices', 'Books.publishers.offices'],
        ])
        assert.deepStrictEqual(jsw.getExport('Genre.code').rhs, { Fiction: 'Fiction' })
        assert.deepStrictEqual(jsw.getExport('Genres.text.code')?.rhs, { Fiction: 'Fiction' })
        assert.deepStrictEqual(jsw.getExport('Books.publisher.type')?.rhs, { self: 'self', independent: 'independent' })
        assert.deepStrictEqual(jsw.getExport('Books.publishers.office.size')?.rhs, {
            small: 'small',
            medium: 'medium',
            large: 'large',
        })
    })

    it('should test service exports with entities proxy', async () => {
        const paths = (
            await prepareUnitTest('inlinecompositions/model.cds', locations.testOutput('inlinecompositions_test'), {
                typerOptions: { useEntitiesProxy: true },
            })
        ).paths
        const jsw = await JSASTWrapper.initialise(
            path.join(paths[2], 'index.js'),
            true
        )
        jsw.exportsAre([
            ['Genre', 'Genres'],
            ['Genres', 'Genres'],
            ['Book', 'Books'],
            ['Books', 'Books'],
            ['Books', 'Books'],
            ['Genres.text', 'Genres.texts'],
            ['Genres.texts', 'Genres.texts'],
            ['Books.publisher', 'Books.publishers'],
            ['Books.publishers', 'Books.publishers'],
            ['Books.publishers.PEditor', 'Books.publishers.intEditors'],
            ['Books.publishers.PEditors', 'Books.publishers.intEditors'],
            ['Books.publishers.intEditors', 'Books.publishers.intEditors'],
            ['Books.publishers.EEditor', 'Books.publishers.extEditors'],
            ['Books.publishers.EEditors', 'Books.publishers.extEditors'],
            ['Books.publishers.extEditors', 'Books.publishers.extEditors'],
            ['Books.publishers.office', 'Books.publishers.offices'],
            ['Books.publishers.offices', 'Books.publishers.offices'],
        ])
        assert.deepStrictEqual(jsw.getExport('Genre.code').rhs, { Fiction: 'Fiction' })
        assert.deepStrictEqual(jsw.getExport('Genres.text.code')?.rhs, { Fiction: 'Fiction' })
        assert.deepStrictEqual(jsw.getExport('Books.publisher.type')?.rhs, { self: 'self', independent: 'independent' })
        assert.deepStrictEqual(jsw.getExport('Books.publishers.office.size')?.rhs, {
            small: 'small',
            medium: 'medium',
            large: 'large',
        })

        jsw.hasProxyExport('Genres.text', ['code'])
        jsw.hasProxyExport('Books.publisher', ['type'])
        jsw.hasProxyExport('Books.publishers.office', ['size'])
    })

    it('should test service exports with direct csn export', async () => {
        const paths = (
            await prepareUnitTest('inlinecompositions/model.cds', locations.testOutput('inlinecompositions_test'), {
                typerOptions: {},
            })
        ).paths
        const jsw = await JSASTWrapper.initialise(
            path.join(paths[2], 'index.js'),
            false
        )
        jsw.exportsAre([
            ['Genre', 'Genres'],
            ['Genres', 'Genres'],
            ['Book', 'Books'],
            ['Books', 'Books'],
            ['Books', 'Books'],
            ['Genres.text', 'Genres.texts'],
            ['Genres.texts', 'Genres.texts'],
            ['Books.publisher', 'Books.publishers'],
            ['Books.publishers', 'Books.publishers'],
            ['Books.publishers.PEditor', 'Books.publishers.intEditors'],
            ['Books.publishers.PEditors', 'Books.publishers.intEditors'],
            ['Books.publishers.intEditors', 'Books.publishers.intEditors'],
            ['Books.publishers.EEditor', 'Books.publishers.extEditors'],
            ['Books.publishers.EEditors', 'Books.publishers.extEditors'],
            ['Books.publishers.extEditors', 'Books.publishers.extEditors'],
            ['Books.publishers.office', 'Books.publishers.offices'],
            ['Books.publishers.offices', 'Books.publishers.offices'],
        ])
        assert.deepStrictEqual(jsw.getExport('Genre.code').rhs, { Fiction: 'Fiction' })
        assert.deepStrictEqual(jsw.getExport('Genres.text.code')?.rhs, { Fiction: 'Fiction' })
        assert.deepStrictEqual(jsw.getExport('Books.publisher.type')?.rhs, { self: 'self', independent: 'independent' })
        assert.deepStrictEqual(jsw.getExport('Books.publishers.office.size')?.rhs, {
            small: 'small',
            medium: 'medium',
            large: 'large',
        })
    })
})