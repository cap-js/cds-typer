'use strict'

const fs = require('node:fs')
const path = require('node:path')
const { execSync } = require('node:child_process')

const dir = path.join(__dirname, '_out', 'dummy-project')
const typer = path.join(__dirname, '..', '..')

beforeAll(()=>{
    fs.rmSync(dir, { recursive: true, force: true })
    fs.mkdirSync(dir, { recursive: true })
    // copy .tar over. This ensures we end up with a cds-typer as if it was downloaded from npmjs,
    // without its node_modules. That is import to avoid having multiple instances of sap/cds(-dk)
    // which will cause confusion during build-plugin-registration.
    execSync(`npm pack; mv ${path.join(typer, '*cds-typer-*.tgz')} ${path.join(dir, 'typer.tgz')}`, { cwd: typer })
    execSync([
        'npx cds init',
        'npx tsc --init',
        'npx cds add sample',
        'npm i @sap/cds-dk typer.tgz',
        'npx cds-typer "*" --outputDirectory @cds-models'
    ].join(';'), { cwd: dir })
    // clean package.json
    const packageJsonPath = path.join(dir, 'package.json')
    const packageJson = require(packageJsonPath)
    delete packageJson.dependencies['@sap/cds']
    packageJson.devDependencies['typescript'] = '*'
    fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
})

describe('cds build', () => {
    test('Dummy Project', async () => {
        execSync('cds build', { cwd: dir })
    })
})
