'use strict'
// hacking this into process.env as very first thing before cds.env is loaded
process.env.cds_typer_IEEE754Compatible = 'true'
const { describe, beforeAll, test, expect } = require('@jest/globals')
const cli = require('../../lib/cli')
const { configuration } = require('../../lib/config')

describe('CLI Options', () => {
    beforeAll(async () => cli.prepareParameters(['"*"', '--outputDirectory', 'y', '--inline_declarations', 'flat']))
    test('cds.env Overridden By CLI', async () => expect(configuration.outputDirectory).toBe('y'))
    test('Set Parameter Via CLI Using camelCase', async () => expect(configuration.inlineDeclarations).toBe('flat'))
    test('Default Value', async () => expect(''+configuration.useEntitiesProxy).toBe(cli.flags.useEntitiesProxy.default))  // stringify, as config will contain a postprocessed boolean
    test('Set Via process.env File', async () => expect(configuration.IEEE754Compatible).toBe(true))
})