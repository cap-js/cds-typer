'use strict'

const fs = require('fs').promises
const path = require('path')
const cds2ts = require('../../lib/compile')
const { toHaveAll, toOnlyHave, toExactlyHave, toHavePropertyOfType, TSParser } = require('../util')

const dir = './test/unit/files/output/'

expect.extend({ toHaveAll, toOnlyHave, toExactlyHave, toHavePropertyOfType })

// compilation produces semantically complete Typescript
describe('Hana Data Types', () => {
    beforeEach(async () => await fs.unlink(dir).catch(err => {})) //console.log('INFO', `Unable to unlink '${dir}' (${err}). This may not be an issue.`)

    test('all types', async () => {
        const paths = await cds2ts
            .compileFromFile('./test/unit/files/hana/model.cds', {
                rootDirectory: dir,
            })
            // eslint-disable-next-line no-console
            .catch((err) => console.error(err))
        expect(paths).toHaveLength(3) // the one module [1] + baseDefinitions [0] + hana definitions [2]
        const { namespaces } = new TSParser().parse(path.join(paths[1], 'index.ts'))
        const classes = namespaces.top.classes
        const expectedProps = ['Everything_', 'EverythingAspect']
        expect(classes).toExactlyHave(expectedProps)
        expect(classes.EverythingAspect).toExactlyHave([
            'bar',
            'smallint',
            'tinyint',
            'smalldecimal',
            'real',
            'char',
            'nchar',
            'varchar',
            'clob',
            'binary',
            'point',
            'geometry',
            'shorthand'
        ])
        expect(classes.EverythingAspect).toHavePropertyOfType('bar', ['string'])
        expect(classes.EverythingAspect).toHavePropertyOfType('smallint', ['_cds_hana.SMALLINT'])
        expect(classes.EverythingAspect).toHavePropertyOfType('tinyint', ['_cds_hana.TINYINT'])
        expect(classes.EverythingAspect).toHavePropertyOfType('smalldecimal', ['_cds_hana.SMALLDECIMAL'])
        expect(classes.EverythingAspect).toHavePropertyOfType('real', ['_cds_hana.REAL'])
        expect(classes.EverythingAspect).toHavePropertyOfType('char', ['_cds_hana.CHAR'])
        expect(classes.EverythingAspect).toHavePropertyOfType('nchar', ['_cds_hana.NCHAR'])
        expect(classes.EverythingAspect).toHavePropertyOfType('varchar', ['_cds_hana.VARCHAR'])
        expect(classes.EverythingAspect).toHavePropertyOfType('clob', ['_cds_hana.CLOB'])
        expect(classes.EverythingAspect).toHavePropertyOfType('binary', ['_cds_hana.BINARY'])
        expect(classes.EverythingAspect).toHavePropertyOfType('point', ['_cds_hana.ST_POINT'])
        expect(classes.EverythingAspect).toHavePropertyOfType('geometry', ['_cds_hana.ST_GEOMETRY'])
        expect(classes.EverythingAspect).toHavePropertyOfType('shorthand', ['_cds_hana.REAL'])
    })
})