'use strict'

const fs = require('fs').promises
const path = require('path')
const cds2ts = require('../../lib/compile')
const { ASTWrapper, check } = require('../ast')
const { locations } = require('../util')

const dir = locations.testOutput('views_test')

describe('View Entities', () => {
    let astw

    beforeEach(async () => await fs.unlink(dir).catch(() => {}))
    beforeAll(async () => {
        const paths = await cds2ts
            .compileFromFile(locations.unit.files('views/model.cds'), { outputDirectory: dir, inlineDeclarations: 'structured' })
        astw = new ASTWrapper(path.join(paths[1], 'index.ts'))
    })

    test('View Entity Present', () => {
        astw.exists('_FooViewAspect')
    })

    test('Expected Properties Present', () => {
        astw.exists('_FooViewAspect', 'id', ({type}) => check.isNullable(type, [check.isNumber]))
        astw.exists('_FooViewAspect', 'code', ({type}) => check.isNullable(type, [check.isString]))
        // including alias
        astw.exists('_FooViewAspect', 'alias', ({type}) => check.isNullable(type, [check.isString]))
    })

    test('Unselected Field Not Present', () => {
        expect(() => astw.exists('_FooViewAspect', 'flag', ({type}) => check.isNullable(type, [check.isString]))).toThrow(Error)
    })
})
