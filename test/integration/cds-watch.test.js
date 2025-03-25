'use strict'

const fs = require('node:fs')
const path = require('node:path')
const { describe, it, before } = require('node:test')
const assert = require('node:assert')
const { execSync } = require('node:child_process')
const cds = require('@sap/cds')

const dir = path.join(__dirname, 'dummy-project')
// use a slightly different model directory to avoid race-conditions with
// vscode, as our extension eagerly creates @cds-models when creating a new .cds file
// as part of our tests
const modelsDir = path.join(dir, '@cds-models-test')
const logs = []

describe('cds watch', () => {
    before(async () => {
        // spy on cds.debug('cli|build')
        const cdsLog = cds.debug
        cds.debug = (...args) => {
            return args[0] === 'cli|build'
                ? (...largs) => {
                  logs.push(args, largs)
                  return cdsLog(...args)(...largs)
                }                
                : cdsLog(...args)}
    })

    it('runs once before cds watch', async () => {
        await fs.promises.rm(modelsDir, { recursive: true, force: true })
        cds.watched = true
        cds.root = dir
        // need to set manually, as we don't go through the regular cds bootstrap
        cds.env.typer = { output_directory: modelsDir }
        cds.env.log.levels.cli = 'debug'
        await require('../../cds-plugin')
        assert.ok(logs.some(log => log.some(line => line.match(/>> start cds-typer/))))
        logs.length = 0
        await require('../../cds-plugin')
        // should not run when models are already there
        assert.ok(!logs.some(log => log.some(line => line.match(/>> start cds-typer/))))
    })
})
