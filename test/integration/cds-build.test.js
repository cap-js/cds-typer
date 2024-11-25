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
    const dir = path.join(__dirname, '_out', 'dummy-project')  // local dir?
    const typer = path.join(__dirname, '..', '..')
    try { fs.unlinkSync(dir) } catch {}  // could be first run and not exist
    try { fs.mkdirSync(dir, { recursive: true }) } catch {}  // could already exist from former run
    [
        'cds init',
        'cds add tiny-sample',
        'npm i @sap/cds-dk',
        //'npm i typescript',
        //'npm i',
        //`npm i --save-dev file:${typer}`
    ].forEach(cmd => {
        try {
            execSync(cmd, { cwd: dir }) // could have been initialised before
        } catch {}
    });
    const packageJsonPath = path.join(dir, 'package.json')
    const packageJson = require(packageJsonPath)
    delete packageJson.dependencies['@sap/cds']
    packageJson.devDependencies['typescript'] = '*'
    fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
    [
        'npm i @sap/cds-dk',
        'rm -rf node_modules/@sap/cds',
        'cds-typer "*" --outputDirectory @cds-models',
        'cds build'
    ].forEach(cmd => execSync(cmd, { cwd: dir }))
   })
})
