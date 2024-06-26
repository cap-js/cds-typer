#!/usr/bin/env node
/* eslint-disable no-console */
'use strict'

const cds = require('@sap/cds')
const { compileFromFile } = require('./compile')
const { parseCommandlineArgs } = require('./util')
const { deprecated, _keyFor } = require('./logging')
const path = require('path')
const { EOL } = require('node:os')

const EOL2 = EOL + EOL
const toolName = 'cds-typer'

const flags = {
    outputDirectory: {
        desc: 'Root directory to write the generated files to.',
        default: './',
        type: 'string'
    },
    help: {
        desc: 'This text.',
    },
    logLevel: {
        desc: 'Minimum log level that is printed.',
        allowed: Object.keys(cds.log.levels).concat(Object.keys(deprecated)),
        allowedHint: Object.keys(cds.log.levels).join(' | '),  // FIXME: remove once old levels are faded out
        default: _keyFor(cds.log.levels.ERROR),
    },
    jsConfigPath: {
        desc: `Path to where the jsconfig.json should be written.${EOL}If specified, ${toolName} will create a jsconfig.json file and${EOL}set it up to restrict property usage in types entities to${EOL}existing properties only.`,
        type: 'string'
    },
    version: {
        desc: 'Prints the version of this tool.'
    },
    inlineDeclarations: {
        desc: `Whether to resolve inline type declarations${EOL}flat: (x_a, x_b, ...)${EOL}or structured: (x: {a, b}).`,
        allowed: ['flat', 'structured'],
        default: 'structured'
    },
    propertiesOptional: {
        desc: `If set to true, properties in entities are${EOL}always generated as optional (a?: T).`,
        allowed: ['true', 'false'],
        default: 'true'
    },
    IEEE754Compatible: {
        desc: `If set to true, floating point properties are generated${EOL}as IEEE754 compatible '(number | string)' instead of 'number'.`,
        allowed: ['true', 'false'],
        default: 'false'
    }
}

const hint = () => 'Missing or invalid parameter(s). Call with --help for more details.'
const indent = (s, indentation) => s.split(EOL).map(line => `${indentation}${line}`).join(EOL)

const help = () => `SYNOPSIS${EOL2}` +
        indent('cds-typer [cds file | "*"]', '  ') + EOL2 +
        indent(`Generates type information based on a CDS model.${EOL}Call with at least one positional parameter pointing${EOL}to the (root) CDS file you want to compile.`, '  ') + EOL2 +
            `OPTIONS${EOL2}` +
            Object.entries(flags)
                .sort()
                .map(([key, value]) => {
                    let s = indent(`--${key}`, '  ')
                    if (value.allowedHint) {
                        s += ` ${value.allowedHint}`
                    } else if (value.allowed) {
                        s += `: <${value.allowed.join(' | ')}>`
                    } else if (value.type) {
                        s += `: <${value.type}>`
                    }
                    if (value.default) {
                        s += EOL
                        s += indent(`(default: ${value.default})`, '    ')
                    }
                    s += `${EOL2}${indent(value.desc, '    ')}`
                    return s
                }
                ).join(EOL2)

const version = () => require('../package.json').version

const main = async args => {
    if ('help' in args.named) {
        console.log(help())
        process.exit(0)
    }
    if ('version' in args.named) {
        console.log(version())
        process.exit(0)
    }
    if (args.positional.length === 0) {
        console.log(hint())
        process.exit(1)
    }
    if (args.named.jsConfigPath && !args.named.jsConfigPath.endsWith('jsconfig.json')) {
        args.named.jsConfigPath = path.join(args.named.jsConfigPath, 'jsconfig.json')
    }
    const newLogLevel = deprecated[args.named.logLevel]
    if (newLogLevel) {
        console.warn(`deprecated log level '${args.named.logLevel}', use '${newLogLevel}' instead (changing this automatically for now).`)
        args.named.logLevel = newLogLevel
    }

    compileFromFile(args.positional, {
        // temporary fix until rootDir is faded out
        outputDirectory: [args.named.outputDirectory, args.named.rootDir].find(d => d !== './') ?? './',
        logLevel: cds.log.levels[args.named.logLevel] ?? args.named.logLevel,
        jsConfigPath: args.named.jsConfigPath,
        inlineDeclarations: args.named.inlineDeclarations,
        propertiesOptional: args.named.propertiesOptional === 'true',
        IEEE754Compatible: args.named.IEEE754Compatible === 'true'
    })
}

if (require.main === module) {
    main(parseCommandlineArgs(process.argv.slice(2), flags))
}