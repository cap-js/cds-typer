'use strict'

const fs = require('node:fs')

const path = require('path')
const { before, describe, it } = require('node:test')
const assert = require('assert')
const { ASTWrapper } = require('../ast')
const { locations, prepareUnitTest } = require('../util')

describe('EDMX Imports', () => {
    let paths

    before(async () => {
        paths = (await prepareUnitTest('external/srv/external/CatalogService.csn', locations.testOutput('external_test'))).paths
    })

    it('should generate types for EDMX imports', async () => {
        assert.ok(fs.existsSync(path.join(paths.find(p => p.endsWith('CatalogService'), 'index.ts'))))
    })

    it('should have the element present', async () => {
        const astw = new ASTWrapper(path.join(paths.find(p => p.endsWith('CatalogService')), 'index.ts'))
        assert.ok(astw.exists('_BookAspect', 'metadata'))
    })
})