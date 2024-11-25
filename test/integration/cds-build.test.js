'use strict'

const { tmpdir } = require('os')
const fs = require('fs')
const path = require('path')
const cds2ts = require('../../lib/compile')
const { resolveAliases, locations, createProject } = require('../util')
const { execSync } = require('child_process')
const { fail } = require('assert')
const { log } = require('@sap/cds')

describe('cds build', () => {
   test('Dummy Project', async () => {
    const dir = path.join(tmpdir(), 'dummy-project')
    const typer = path.join(__dirname, '..', '..')
    try { fs.unlinkSync(dir) } catch {}  // could be first run and not exist
    try { fs.mkdirSync(dir) } catch {}  // could already exist from former run
    [
        'cds init',
        'cds add tiny-sample',
        'npm i @sap/cds-dk',
        'npm i',
        `npm i file:${typer}`
    ].forEach(cmd => {
        try {
            execSync(cmd, { cwd: dir }) // could have been initialised before
        } catch {}
    });
    ['cds-typer "*" --outputDirectory @cds-models', 'cds build'].forEach(cmd => execSync(cmd, { cwd: dir }))
   })
})
