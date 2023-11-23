'use strict'

const path = require('path')
const cds2ts = require('../../lib/compile')
const { locations } = require('../util')
const { ASTWrapper, check } = require('../ast')

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
            ast.exists('_EverythingAspect', 'bar', ({type}) => check.isNullable(type, [check.isString]))
            ast.exists('_EverythingAspect', 'smallint', ({type}) => check.isNullable(type, [t => t.name === 'SMALLINT']))
            ast.exists('_EverythingAspect', 'tinyint', ({type}) => check.isNullable(type, [t => t.name === 'TINYINT']))
            ast.exists('_EverythingAspect', 'smalldecimal', ({type}) => check.isNullable(type, [t => t.name === 'SMALLDECIMAL']))
            ast.exists('_EverythingAspect', 'real', ({type}) => check.isNullable(type, [t => t.name === 'REAL']))
            ast.exists('_EverythingAspect', 'char', ({type}) => check.isNullable(type, [t => t.name === 'CHAR']))
            ast.exists('_EverythingAspect', 'nchar', ({type}) => check.isNullable(type, [t => t.name === 'NCHAR']))
            ast.exists('_EverythingAspect', 'varchar', ({type}) => check.isNullable(type, [t => t.name === 'VARCHAR']))
            ast.exists('_EverythingAspect', 'clob', ({type}) => check.isNullable(type, [t => t.name === 'CLOB']))
            ast.exists('_EverythingAspect', 'binary', ({type}) => check.isNullable(type, [t => t.name === 'BINARY']))
            ast.exists('_EverythingAspect', 'point', ({type}) => check.isNullable(type, [t => t.name === 'ST_POINT']))
            ast.exists('_EverythingAspect', 'geometry', ({type}) => check.isNullable(type, [t => t.name === 'ST_GEOMETRY']))
            ast.exists('_EverythingAspect', 'shorthand', ({type}) => check.isNullable(type, [t => t.name === 'REAL']))
        })
})