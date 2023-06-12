#!/usr/bin/env node
/* eslint-disable no-console */
'use strict'

const { compileFromFile } = require('./compile')
const { parseCommandlineArgs } = require('./util')
const { Levels } = require('./logging')
const path = require('path')

const toolName = 'cds-typer'

const flags = {
    // FIXME: remove asap
    rootDir: {
        desc: '[DEPRICATED] use outputDirectory instead',
        default: './',
    },
    outputDirectory: {
        desc: 'root directory to write generated files to',
        default: './',
    },
    help: {
        desc: 'this text',
    },
    logLevel: {
        desc: `minimum log level`,
        allowed: Object.keys(Levels),
        default: Object.keys(Levels).at(-1),
    },
    jsConfigPath: {
        desc: `Path to where the jsconfig.json should be written. If specified, ${toolName} will create a jsconfig.json file and set it up to restrict property usage in types entities to existing properties only.`,
    },
    version: {
        desc: 'prints the version of this tool'
    },
    inlineDeclarations: {
        desc: 'whether to resolve inline type declarations flat (x_a, x_b, ...) or structured (x: {a, b})',
        allowed: ['flat', 'structured'],
        default: 'structured'
    },
    propertiesOptional: {
        desc: 'if set to true, properties in entities are always generated as optional (a?: T)',
        allowed: ['true', 'false'],
        default: 'true'
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
                .map(([key, value]) => {
                    let s = `--${key}: ${value.desc}`
                    if (value.allowed) {
                        s += ` [allowed: ${value.allowed.join(' | ')}]`
                    }
                    if (value.default) {
                        s += ` (default: ${value.default})`
                    }
                    return s
                }
            ).join('\n\n')
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
    if (args.named.jsConfigPath && !args.named.jsConfigPath.endsWith('jsconfig.json')) {
        args.named.jsConfigPath = path.join(args.named.jsConfigPath, 'jsconfig.json')
    }
    compileFromFile(args.positional, {
        // temporary fix until rootDir is faded out
        outputDirectory: [args.named.outputDirectory, args.named.rootDir].find(d => d !== './') ?? './',
        logLevel: Levels[args.named.logLevel],
        jsConfigPath: args.named.jsConfigPath,
        inlineDeclarations: args.named.inlineDeclarations,
        propertiesOptional: args.named.propertiesOptional === 'true'
    })
}

if (require.main === module) {
    main(parseCommandlineArgs(process.argv.slice(2), flags))
}
