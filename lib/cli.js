#!/usr/bin/env node
/* eslint-disable no-console */

'use strict'

const { compileFromFile } = require('./compile')
const { parseCommandlineArgs } = require('./util')
const { Levels } = require('./logging')
const path = require('path')

const toolName = 'cds-typer'

const flags = {
    rootDir: {
        desc: 'root directory to write generated files to',
        default: './',
    },
    help: {
        desc: 'this text',
    },
    loglevel: {
        desc: `minimum log level, which should be one of ${Object.keys(Levels).join(', ')}`,
        default: Object.keys(Levels).at(-1),
    },
    jsConfigPath: {
        desc: `Path to where the jsconfig.json should be written. If specified, ${toolName} will create a jsconfig.json file and set it up to restrict property usage in types entities to existing properties only.`,
    },
    version: {
        desc: 'prints the version of this tool'
    }
}

const hint = () => console.log('Missing or invalid parameter(s). Call with --help for more details.')

const help = () =>
    console.log(
        '[SYNOPSIS]\n' +
        'Call with at least one positional parameter pointing to the (root) CDS file you want to compile.\n' +
            'Additionaly, you can use the following parameters:\n' +
            Object.entries(flags)
                .sort()
                .map(([key, value]) =>
                    value.default
                        ? `  --${key}: ${value.desc} (default: ${value.default})`
                        : `  --${key}: ${value.desc}`
                )
                .join('\n')
    )

const version = () => console.log(require('../package.json').version)

const main = async (args) => {
    if ('help' in args.named) {
        help()
        process.exit(0)
    }
    if ('version' in args.named) {
        version()
        process.exit(0)
    }
    if (args.positional.length === 0) {
        hint()
        process.exit(1)
    }
    const ll = args.named.loglevel.toUpperCase()
    if (!(ll in Levels)) {
        hint()
        process.exit(2)
    }
    if (args.named.jsConfigPath && !args.named.jsConfigPath.endsWith('jsconfig.json')) {
        args.named.jsConfigPath = path.join(args.named.jsConfigPath, 'jsconfig.json')
    }
    compileFromFile(args.positional, {
        rootDirectory: args.named.rootDir,
        logLevel: Levels[ll],
        jsConfigPath: args.named.jsConfigPath,
    })
}

if (require.main === module) {
    main(parseCommandlineArgs(process.argv.slice(2), flags))
}
