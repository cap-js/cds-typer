'use strict'
// hacking this into process.env as very first thing before cds.env is loaded
process.env.cds_typer_IEEE754Compatible = 'true'
const { describe, before, it } = require('node:test')
const assert = require('assert')
const cli = require('../../lib/cli')
const { configuration } = require('../../lib/config')

describe('CLI Options', () => {
    before(async () => cli.prepareParameters(['"*"', '--outputDirectory', 'y', '--inline_declarations', 'flat']))

    it('should override cds.env by CLI', async () => {
        assert.strictEqual(configuration.outputDirectory, 'y')
    })

    it('should set parameter via CLI using snake_case', async () => {
        assert.strictEqual(configuration.inlineDeclarations, 'flat')
    })

    it('should use default value', async () => {
        assert.strictEqual('' + configuration.useEntitiesProxy, cli.flags.useEntitiesProxy.default)  // stringify, as config will contain a postprocessed boolean
    })

    // this test works fine locally, but fails on CI
    it.todo('should set via process.env file', async () => {
        assert.strictEqual(configuration.IEEE754Compatible, true)
    })
})