'use strict'
const { describe, it } = require('node:test')
const assert = require('node:assert/strict')
const { spawnSync } = require('node:child_process')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')

const cli = path.resolve(__dirname, '../../lib/cli.js')
const cdsPath = JSON.stringify(require.resolve('@sap/cds'))

describe('CLI compilation', () => {
    it('skips runtime initialization while retaining model plugins in production', t => {
        const project = fs.mkdtempSync(path.join(os.tmpdir(), 'cds-typer-cli-'))
        t.after(() => fs.rmSync(project, { recursive: true, force: true }))
        const output = path.join(project, 'types')
        const runtimePlugin = path.join(project, 'runtime-plugin.cjs')
        const runtimeState = path.join(project, 'runtime-state.txt')
        const modelPlugin = path.join(project, 'model-plugin.cjs')

        fs.writeFileSync(path.join(project, 'package.json'), JSON.stringify({ name: 'cli-test' }))
        fs.writeFileSync(path.join(project, 'schema.cds'), 'namespace sample; entity Books { key ID: Integer; }')
        /** Mimics a cap-js/* library's startup guard (e.g. telemetry) without requiring service credentials. */
        fs.writeFileSync(runtimePlugin, `
            const cds = require(${cdsPath})
            const fs = require('node:fs')
            if (cds.cli.command in { '': 1, serve: 1, run: 1 }) {
                fs.writeFileSync(${JSON.stringify(runtimeState)}, 'initialized')
                throw new Error('Runtime integration requires service credentials')
            }
            fs.writeFileSync(${JSON.stringify(runtimeState)}, 'skipped')
        `)
        /** Adds a field absent from the schema to prove model plugins still run. */
        fs.writeFileSync(modelPlugin, `
            const cds = require(${cdsPath})
            cds.on('loaded', model => {
                model.definitions['sample.Books'].elements.pluginField = { type: 'cds.String' }
            })
        `)

        /** Isolates CAP's global state and loads the production profile through the real CLI. */
        const args = [cli, '*', '--outputDirectory', output, '--outputDTsFiles', 'true']
        const result = spawnSync(process.execPath, args, {
            cwd: project,
            env: {
                ...process.env,
                NODE_ENV: 'production',
                CDS_ENV: 'production',
                CDS_USER_HOME: project,
                CDS_PLUGINS: JSON.stringify({
                    runtime: { impl: runtimePlugin },
                    model: { impl: modelPlugin }
                })
            },
            encoding: 'utf8',
            timeout: 15000
        })

        assert.strictEqual(result.status, 0, result.stderr || String(result.error))
        assert.strictEqual(fs.readFileSync(runtimeState, 'utf8'), 'skipped')
        assert.match(fs.readFileSync(path.join(output, 'sample/index.d.ts'), 'utf8'), /pluginField\??: string/)
    })

    it('preserves the command context when imported as a module', () => {
        const result = spawnSync(process.execPath, ['-e', `
            const cds = require(${cdsPath})
            cds.cli.command = 'serve'
            require(${JSON.stringify(cli)})
            require('node:assert/strict').strictEqual(cds.cli.command, 'serve')
        `], { encoding: 'utf8', timeout: 15000 })

        assert.strictEqual(result.status, 0, result.stderr || String(result.error))
    })
})
