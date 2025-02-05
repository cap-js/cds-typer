'use strict'

const { before, describe, it } = require('node:test')
const assert = require('assert')
const { locations, prepareUnitTest } = require('../util')
const { check } = require('../ast')

describe('Builtin HANA Datatypes', () => {
    let paths
    let astw

    before(async () => {
        ({astw, paths} = await prepareUnitTest('hana/model.cds', locations.testOutput('hana_files')))
    })

    // the one module [1] + baseDefinitions [0] + hana definitions [2]
    it('should create output files', () => {
        assert.strictEqual(paths.length, 3)
    })

    it('should contain import of HANA types', () => {
        const imp = astw.getImports()
        assert.ok(imp.map(i => i.as).includes('_cds_hana'))
    })

    it('should have correct types', () => {
        astw.exists('_EverythingAspect', 'bar', ({type}) => check.isNullable(type, [check.isString]))
        astw.exists('_EverythingAspect', 'smallint', ({type}) => check.isNullable(type, [t => t.name === 'SMALLINT']))
        astw.exists('_EverythingAspect', 'tinyint', ({type}) => check.isNullable(type, [t => t.name === 'TINYINT']))
        astw.exists('_EverythingAspect', 'smalldecimal', ({type}) => check.isNullable(type, [t => t.name === 'SMALLDECIMAL']))
        astw.exists('_EverythingAspect', 'real', ({type}) => check.isNullable(type, [t => t.name === 'REAL']))
        astw.exists('_EverythingAspect', 'char', ({type}) => check.isNullable(type, [t => t.name === 'CHAR']))
        astw.exists('_EverythingAspect', 'nchar', ({type}) => check.isNullable(type, [t => t.name === 'NCHAR']))
        astw.exists('_EverythingAspect', 'varchar', ({type}) => check.isNullable(type, [t => t.name === 'VARCHAR']))
        astw.exists('_EverythingAspect', 'clob', ({type}) => check.isNullable(type, [t => t.name === 'CLOB']))
        astw.exists('_EverythingAspect', 'binary', ({type}) => check.isNullable(type, [t => t.name === 'BINARY']))
        astw.exists('_EverythingAspect', 'point', ({type}) => check.isNullable(type, [t => t.name === 'ST_POINT']))
        astw.exists('_EverythingAspect', 'geometry', ({type}) => check.isNullable(type, [t => t.name === 'ST_GEOMETRY']))
        astw.exists('_EverythingAspect', 'shorthand', ({type}) => check.isNullable(type, [t => t.name === 'REAL']))
    })
})