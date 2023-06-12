'use strict'

const path = require('path')
const cds2ts = require('../../lib/compile')
const { locations } = require('../util')
const { ASTWrapper } = require('../ast')

const dir = locations.testOutput('hana_files')

// compilation produces semantically complete Typescript
describe('Builtin HANA Datatypes', () => {
        let paths
        let ast

        beforeAll(async () => {
            paths = await cds2ts
                .compileFromFile(locations.unit.files('hana/model.cds'), {
                    outputDirectory: dir,
                })
                // eslint-disable-next-line no-console
                .catch((err) => console.error(err))
            ast = new ASTWrapper(path.join(paths[1], 'index.ts'))
        })

        test('Output Files Created', () => {
            expect(paths).toHaveLength(3) // the one module [1] + baseDefinitions [0] + hana definitions [2]
        })

        test('Import of HANA Types Present', () => {
            const imp = ast.getImports()
            expect(imp.length).toBe(2)
            expect(imp[0].as).toBe('_cds_hana')
        })

        test('Types Correct', () => {
            ast.exists('_EverythingAspect', 'bar', 'string')
            ast.exists('_EverythingAspect', 'smallint', 'SMALLINT')
            ast.exists('_EverythingAspect', 'tinyint', 'TINYINT')
            ast.exists('_EverythingAspect', 'smalldecimal', 'SMALLDECIMAL')
            ast.exists('_EverythingAspect', 'real', 'REAL')
            ast.exists('_EverythingAspect', 'char', 'CHAR')
            ast.exists('_EverythingAspect', 'nchar', 'NCHAR')
            ast.exists('_EverythingAspect', 'varchar', 'VARCHAR')
            ast.exists('_EverythingAspect', 'clob', 'CLOB')
            ast.exists('_EverythingAspect', 'binary', 'BINARY')
            ast.exists('_EverythingAspect', 'point', 'ST_POINT')
            ast.exists('_EverythingAspect', 'geometry', 'ST_GEOMETRY')
            ast.exists('_EverythingAspect', 'shorthand', 'REAL')
        })
})