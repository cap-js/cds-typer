'use strict'

const fs = require('fs').promises
const path = require('path')
const cds2ts = require('../../lib/compile')
const { ASTWrapper, check } = require('../ast')
const { locations } = require('../util')

const dir = locations.testOutput('inline_test')
console.log(check)

// compilation produces semantically complete Typescript
describe('Inline Type Declarations', () => {
    beforeEach(async () => await fs.unlink(dir).catch(() => {})) //console.log('INFO', `Unable to unlink '${dir}' (${err}). This may not be an issue.`)

    test('Structured', async () => {
        const paths = await cds2ts
            .compileFromFile(locations.unit.files('inline/model.cds'), { outputDirectory: dir, inlineDeclarations: 'structured' })
            // eslint-disable-next-line no-console
            .catch((err) => console.error(err))
        const ast = new ASTWrapper(path.join(paths[1], 'index.ts'))
        expect(ast.exists('_BarAspect', 'x', ({name, type}) => { 
                const [nonNullType] = type.subtypes
                const [a, y] = nonNullType.members
                const [b, c] = a.type.subtypes[0].members
                return name === 'x' 
                    && check.isNullable(type)
                    && nonNullType.members.length === 2
                    && a.name === 'a'
                    && check.isNullable(a.type)
                        && b.name === 'b'
                        && check.isNullable(b.type, [check.isNumber])
                        && c.name === 'c'
                        && check.isNullable(c.type, [t => t.nodeType === 'typeReference' && t.args[0].full === 'Foo'])
                    && y.name === 'y'
                    && check.isNullable(y.type, [check.isString])
        })).toBeTruthy()
    })

    test('Flat', async () => {
        const paths = await cds2ts
            .compileFromFile(locations.unit.files('inline/model.cds'), { outputDirectory: dir, inlineDeclarations: 'flat' })
            // eslint-disable-next-line no-console
            .catch((err) => console.error(err))
        const ast = new ASTWrapper(path.join(paths[1], 'index.ts'))
        expect(ast.exists('_BarAspect', 'x_a_b', ({type}) => check.isNullable(type, [check.isNumber]))).toBeTruthy() 
        expect(ast.exists('_BarAspect', 'x_y', ({type}) => check.isNullable(type, [check.isString]))).toBeTruthy() 
        expect(ast.exists('_BarAspect', 'x_a_c', ({type}) => check.isNullable(type, [m => m.name === 'to' && m.args[0].full === 'Foo' ]))).toBeTruthy()
    })
})