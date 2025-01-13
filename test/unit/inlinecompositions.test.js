'use strict'

const path = require('path')
const { describe, test, expect } = require('@jest/globals')
const { JSASTWrapper } = require('../ast')
const { locations, prepareUnitTest } = require('../util')

/**
 * @typedef {import('../ast').JSASTWrapper} JSASTWrapper
 */

describe('Inline compositions', () => {

    test.each([
        ['with entities proxy', { useEntitiesProxy: true }],
        ['with direct csn export', {}],
    ])('Test exports > %s', async (_, typerOptions) => {
        const paths = (
            await prepareUnitTest('inlinecompositions/model.cds', locations.testOutput('inlinecompositions_test'), {
                typerOptions,
            })
        ).paths
        const jsw = await JSASTWrapper.initialise(
            path.join(paths[1], 'index.js'),
            typerOptions?.useEntitiesProxy ?? false
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
        expect(jsw.getExport('Genre.code').rhs).toEqual({ Fiction: 'Fiction' })
        expect(jsw.getExport('Genres.text.code')?.rhs).toEqual({ Fiction: 'Fiction' })
        expect(jsw.getExport('Books.publisher.type')?.rhs).toEqual({ self: 'self', independent: 'independent' })
        expect(jsw.getExport('Books.publishers.office.size')?.rhs).toEqual({
            small: 'small',
            medium: 'medium',
            large: 'large',
        })

        if (typerOptions?.useEntitiesProxy) {
            jsw.hasProxyExport('Genres.text', ['code'])
            jsw.hasProxyExport('Books.publisher', ['type'])
            jsw.hasProxyExport('Books.publishers.office', ['size'])
        }
    })

    test.each([
        ['with entities proxy', { useEntitiesProxy: true }],
        ['with direct csn export', {}],
    ])('Test service exports > %s', async (_, typerOptions) => {
        const paths = (
            await prepareUnitTest('inlinecompositions/model.cds', locations.testOutput('inlinecompositions_test'), {
                typerOptions,
            })
        ).paths
        const jsw = await JSASTWrapper.initialise(
            path.join(paths[2], 'index.js'),
            typerOptions?.useEntitiesProxy ?? false
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
        expect(jsw.getExport('Genre.code').rhs).toEqual({ Fiction: 'Fiction' })
        expect(jsw.getExport('Genres.text.code')?.rhs).toEqual({ Fiction: 'Fiction' })
        expect(jsw.getExport('Books.publisher.type')?.rhs).toEqual({ self: 'self', independent: 'independent' })
        expect(jsw.getExport('Books.publishers.office.size')?.rhs).toEqual({
            small: 'small',
            medium: 'medium',
            large: 'large',
        })

        if (typerOptions?.useEntitiesProxy) {
            jsw.hasProxyExport('Genres.text', ['code'])
            jsw.hasProxyExport('Books.publisher', ['type'])
            jsw.hasProxyExport('Books.publishers.office', ['size'])
        }
    })
})