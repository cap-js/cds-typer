/**
 * Script to create the cds json schema for cds.typer and write it to package.json
 *
 * ```json
 * "cds": {
 *   "schema": {
 *     "cds": {
 *       "typer": ...
 *     }
 *   }
 * }
 * ```
 */

/** @typedef {{type:string, description:string, enum?:string[], default?: boolean | string | number}} JsonSchemaProperty */
/** @typedef {{type:string,description:string,properties: Record<string,JsonSchemaProperty>}} CdsTyperSchema */

const cli = require('../lib/cli')
const { writeFileSync } = require('fs')
/** @type {{cds: {schema: {cds: {typer: CdsTyperSchema}}}}} */
const packageJson = require('../package.json')
const { join } = require('path')

/**
 * Create cds.typer json schema for relevant cli options.
 *
 * - help and version are excluded
 * - only snake_case options are used
 * @returns {CdsTyperSchema}
 */
function createCdsTyperSchema() {
    /** @type {CdsTyperSchema} */
    const cdsTyperSchema = {
        type: 'object',
        description: 'Configuration for CDS Typer',
        properties: {},
    }

    for (const [fname, flag] of Object.entries(cli.flags).filter(
        ([name, opts]) => !['version', 'help'].includes(name) && opts.snake === name
    )) {
        /** @type {JsonSchemaProperty} */
        const property = {
            type: flag.type ?? 'string',
            description: flag.desc, //.replaceAll(/\n(?!\n)/g, ' ') - use to remove unnecessary line breaks
        }

        if (flag.allowed && flag.type !== 'boolean') property.enum = flag.allowed
        if (flag.default) property.default = flag.default
        if (flag.type === 'boolean') property.default = property.default === 'true' ? true : false

        // override some defaults
        if (fname === 'output_directory') property.default = '@cds-models'

        cdsTyperSchema.properties[fname] = property
    }
    return cdsTyperSchema
}

/**
 * @param {CdsTyperSchema} schema - the json schema for cds.typer
 */
function writeSchemaToPackageJson(schema) {
    packageJson.cds.schema.cds = {
        typer: schema,
    }
    writeFileSync(join(__dirname, '..', 'package.json'), JSON.stringify(packageJson, undefined, 2) + '\n', {
        encoding: 'utf-8',
    })
}

writeSchemaToPackageJson(createCdsTyperSchema())
