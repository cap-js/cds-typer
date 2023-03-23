'use strict'

const fs = require('fs')
const path = require('path')
const cds2ts = require('../../lib/compile')
const { toHaveAll, toOnlyHave, toExactlyHave, TSParser } = require('../util')

const dir = './__tests__/unit/files/output/'

expect.extend({ toHaveAll, toOnlyHave, toExactlyHave })

// compilation produces semantically complete Typescript
describe('Compilation', () => {
    beforeEach(() => {
        try {
            fs.unlinkSync(dir)
        } catch (err) {
            //console.log('INFO', `Unable to unlink '${dir}' (${err}). This may not be an issue.`)
        }
    })

    test('bookshoplet', async () => {
        const paths = await cds2ts
            .compileFromFile('./__tests__/unit/files/bookshoplet/model.cds', {
                rootDirectory: dir,
            })
            // eslint-disable-next-line no-console
            .catch((err) => console.error(err))
        expect(paths).toHaveLength(2) // the one module [1] + baseDefinitions [0]
        const { namespaces } = new TSParser().parse(path.join(paths[1], 'index.ts'))
        const classes = namespaces.top.classes
        const expectedProps = [
            'BookAspect',
            'Books',
            'AuthorAspect',
            'Authors',
            'GenreAspect',
            'Genres',
            'AAspect',
            'A_',
            'BAspect',
            'B_',
            'CAspect',
            'C_',
            'DAspect',
            'D_',
            'EAspect',
            'E_',
            'QueryEntityAspect',
            'QueryEntity_',
        ]
        expect(classes).toExactlyHave(expectedProps)
        expect(classes.BookAspect).toExactlyHave([
            'ID',
            'title',
            'descr',
            'author',
            'genre',
            'stock',
            'price',
            'currency',
            'image',
        ])
    })

    test('inflection', async () => {
        const paths = await cds2ts
            .compileFromFile('./__tests__/unit/files/inflection/model.cds', {
                rootDirectory: dir,
            })
            // eslint-disable-next-line no-console
            .catch((err) => console.error(err))
        const { namespaces } = new TSParser().parse(path.join(paths[1], 'index.ts'))

        const expectedProps = [
            'GizmoAspect',
            'Gizmos',
            'FooSingularAspect',
            'Foos',
            'BarAspect',
            'BarPlural',
            'BazSingularAspect',
            'BazPlural',
            'OneAAspect',
            'ManyAs',
            'OneCAspect',
            'LotsOfCs',
            'OneSingleDAspect',
            'ManyDs'
        ]
        expect(namespaces.top.classes).toExactlyHave(expectedProps) //map((p) => p[0]))
        expect(namespaces).toExactlyHave(['top'])
    })
})
