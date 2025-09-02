'use strict'

const path = require('path')
const { describe, before, it } = require('node:test')
const assert = require('assert')
const cds = require('@sap/cds')
const { check, JSASTWrapper, checkFunction, ASTWrapper } = require('../ast')
const { locations, prepareUnitTest } = require('../util')
const { perEachTestConfig } = require('../config')

// FIXME: missing: inline enums (entity Foo { bar: String enum { ... }})
describe('Enum Action Parameters', () => {
    let astw

    before(async () => astw = (await prepareUnitTest('enums/actions.cds', locations.testOutput('enums_test'))).astw)

    it('should validate coalescing assignment present', () => {
        const actions = astw.getAspectProperty('_FoobarAspect', 'actions')
        checkFunction(actions.type.members.find(fn => fn.name === 'f'), {
            parameterCheck: ({members: [fst]}) => fst.name === 'p'
                && check.isUnionType(fst.type, [
                    t => check.isLiteral(t, 'A'),
                    t => check.isLiteral(t, 'b'),
                ])
        })
    })

    it('should validate external enum definition parameter', () => {
        const actions = astw.getAspectProperty('_FoobarAspect', 'actions')
        checkFunction(actions.type.members.find(fn => fn.name === 'g'), {
            parameterCheck: ({members: [fst]}) => fst.name === 'p'
                && check.isNullable(fst.type, [t => check.isTypeReference(t, 'EnumFoo')])
        })
    })
})

describe('Nested Enums CJS', () => {
    let astw

    before(async () => {
        const paths = (await prepareUnitTest('enums/nested.cds', locations.testOutput('enums_test'))).paths
        astw = await JSASTWrapper.initialise(path.join(paths[1], 'index.js'))
    })

    it('should validate coalescing assignment present', () => {
        const stmts = astw.program.body
        const enm = stmts.find(n => n.type === 'ExpressionStatement' && n.expression.type === 'AssignmentExpression' && n.expression.operator === '??=')
        assert.ok(enm)
        const { left } = enm.expression
        // not checking the entire object chain here...
        assert.strictEqual(left.property.name, 'someEnumProperty')
    })
})

describe('Nested Enums ESM', () => {
    let astw

    before(async () => {
        const paths = (await prepareUnitTest('enums/nested.cds', locations.testOutput('enums_test'), { typerOptions: { targetModuleType: 'esm' } })).paths
        astw = await JSASTWrapper.initialise(path.join(paths[1], 'index.js'), false, { sourceType: 'module' })
    })

    it('should validate coalescing assignment present', () => {
        const stmts = astw.program.body
        const enm = stmts.find(n => n.type === 'ExpressionStatement' && n.expression.type === 'AssignmentExpression' && n.expression.operator === '??=')
        assert.ok(enm)
        const { left } = enm.expression
        // not checking the entire object chain here...
        assert.strictEqual(left.property.name, 'someEnumProperty')
    })
})

describe('Enum Types', () => {
    let astw

    before(async () => astw = (await prepareUnitTest('enums/model.cds', locations.testOutput('enums_test'))).astw)

    describe('Anonymous', () => {
        describe('Within type Definition', () => {
            it('should validate property references artificially named enum', () => {
                astw.exists(
                    '_TypeWithInlineEnumAspect',
                    'inlineEnumProperty',
                    p => check.isNullable(p.type, [t => check.isTypeReference(t, 'TypeWithInlineEnum_inlineEnumProperty')])
                )
            })
        })

        describe('String Enum', () => {
            it('should validate definition present', async () =>
                assert.ok(astw.tree.find(n => n.name === 'InlineEnum_gender'
                && n.initializer.expression.female === 'female'
                && n.initializer.expression.male === 'male'
                && n.initializer.expression.non_binary === 'non-binary')))

            it('should validate referring property', async () =>
                assert.ok(astw.getAspects().find(({name, members}) => name === '_InlineEnumAspect'
                && members?.find(member => member.name === 'gender' && check.isNullable(member.type, [t => t?.full === 'InlineEnum_gender'])))))
        })

        describe('Int Enum', () => {
            it('should validate definition present', async () =>
                assert.ok(astw.tree.find(n => n.name === 'InlineEnum_status'
                && n.initializer.expression.submitted === 1
                && n.initializer.expression.fulfilled === 2
                && n.initializer.expression.canceled === -1
                && n.initializer.expression.shipped === 42)))

            it('should validate referring property', async () =>
                assert.ok(astw.getAspects().find(({name, members}) => name === '_InlineEnumAspect'
                && members?.find(member => member.name === 'status' && check.isNullable(member.type, [t => t?.full === 'InlineEnum_status'])))))
        })

        describe('Mixed Enum', () => {
            it('should validate definition present', async () =>
                assert.ok(astw.tree.find(n => n.name === 'InlineEnum_yesno'
                && n.initializer.expression.catchall === 42
                && n.initializer.expression.no === false
                && n.initializer.expression.yes === true
                && n.initializer.expression.yesnt === false)))

            it('should validate referring property', async () =>
                assert.ok(astw.getAspects().find(({name, members}) => name === '_InlineEnumAspect'
                && members?.find(member => member.name === 'yesno' &&  check.isNullable(member.type, [t => t?.full === 'InlineEnum_yesno'])))))
        })
    })

    describe('Named', () => {
        describe('String Enum', () => {
            it('should validate values', async () =>
                assert.ok(astw.tree.find(n => n.name === 'Gender'
                && n.initializer.expression.female === 'female'
                && n.initializer.expression.male === 'male'
                && n.initializer.expression.non_binary === 'non-binary')))

            it('should validate type alias', async () =>
                assert.ok(astw.getTypeAliasDeclarations().find(n => n.name === 'Gender'
                && ['male', 'female', 'non-binary'].every(t => n.types.includes(t)))))
        })

        describe('Int Enum', () => {
            it('should validate values', async () =>
                assert.ok(astw.tree.find(n => n.name === 'Status'
                && n.initializer.expression.submitted === 1
                && n.initializer.expression.unknown === 0
                && n.initializer.expression.cancelled === -1)))

            it('should validate type alias', async () =>
                assert.ok(astw.getTypeAliasDeclarations().find(n => n.name === 'Status'
                && [-1, 0, 1].every(t => n.types.includes(t)))))
        })

        describe('Mixed Enum', () => {
            it('should validate values', async () =>
                astw.tree.find(n => n.name === 'Truthy'
                && n.yes === true
                && n.no === false
                && n.yesnt === false
                && n.catchall === 42))

            it('should validate type alias', async () =>
                assert.ok(astw.getTypeAliasDeclarations().find(n => n.name === 'Truthy'
                && [true, false, 42].every(t => n.types.includes(t)))))
        })
    })
})


perEachTestConfig(({ output_file, output_d_ts_files }) => {
    describe(`Imported Enums (using output **/*/${output_file} files)`, () => {
        let paths

        before(async () => {
            cds.env.typer.output_d_ts_files = output_d_ts_files
            paths = (await prepareUnitTest('enums/importing/service.cds', locations.testOutput('enums_test'))).paths
        })

        it('should validate type alias and constant in service', () => {
            const service = new ASTWrapper(path.join(paths.find(p => p.endsWith('ExampleService')), output_file)).tree
            const decls = service.filter(n => n.name === 'EnumExample')
            assert.ok(decls.some(check.isTypeAliasDeclaration))
            assert.ok(decls.some(check.isVariableDeclaration))
        })

        it('should validate enum declaration in schema', () => {
            const schema = new ASTWrapper(path.join(paths.find(p => p.endsWith('imported_enum')), output_file)).tree
            const enumExampleNodes = schema.filter(n => n.name === 'EnumExample')
            assert.strictEqual(enumExampleNodes.length, 2)
            assert.ok(enumExampleNodes.find(n => n.nodeType === 'variableStatement'))
            assert.ok(enumExampleNodes.find(n => n.nodeType === 'typeAliasDeclaration'))
        })
    })
})

perEachTestConfig(({ output_file, output_d_ts_files }) => {
    describe(`Enums of typeof (using output **/*/${output_file} files)`, () => {
        /* FIXME: these should actually be inline-defined enums of the referenced type with explicit values
         * ```cds
         * entity X { y: String };
         * type T: X:y { a }  // should produce a string enum with value `a`
         * ```
         * but as a first step, they'll be just a value of the referenced type
         */
        let astw

        before(async () => {
            cds.env.typer.output_d_ts_files = output_d_ts_files
            const paths = (await prepareUnitTest('enums/enumtyperef.cds', locations.testOutput('enums_test'))).paths
            astw = new ASTWrapper(path.join(paths[2], output_file))
        })

        it('should validate enum references in parameters', () => {
            // FIXME: returntypecheck currently broken: cds-typer can currently only deal with refs
            // that contain exactly one element. Type refs are of guise { ref: ['n.A', 'p'] }
            // so right now the property type reference is incorrectly resolved to n.A
            checkFunction(astw.tree.find(node => node.name === 'EnumInParamAndReturn'), {
                //returnTypeCheck: type =>  check.isNullable(type, [check.isIndexedAccessType]),
                parameterCheck: ({members: [fst]}) => check.isNullable(fst.type, [check.isIndexedAccessType])
            })
        })
    })
})