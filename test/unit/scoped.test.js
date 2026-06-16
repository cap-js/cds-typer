'use strict'

const { before, describe, it } = require('node:test')
const assert = require('assert')
const { locations, prepareUnitTest } = require('../util')
const { perEachTestConfig } = require('../config')
const { configuration } = require('../../lib/config')

perEachTestConfig(({ outputDTsFiles, outputFile }) => {
    describe(`Scoped Entities Tests (using output **/*/${outputFile} files)`, () => {
        let astw

        before(async () => {
            configuration.outputDTsFiles = outputDTsFiles
            astw = (await prepareUnitTest('scoped/model.cds', locations.testOutput('scoped_test'))).astw
        })

        it('should verify namespace existence', () => assert.ok(astw.getModuleDeclaration('Name')))

        it('should verify namespace entity existence', () => assert.ok(astw.getAspect('_NameAspect')))

        it('should verify entities within namespace', () => {
            const namespace = astw.getModuleDeclaration('Name')
            assert.ok(namespace)
            assert.ok(namespace.body.find(e => e.name === 'Something'))
            assert.ok(namespace.body.find(e => e.name === 'Something_'))
        })
    })
})
