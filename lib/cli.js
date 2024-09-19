#!/usr/bin/env node
/* eslint-disable no-console */
'use strict'

/**
 * @typedef {import('./typedefs').config.cli.ParameterSchema[number]} Parameter
 */

const cds = require('@sap/cds')
const { compileFromFile } = require('./compile')
const { camelToSnake } = require('./util')
const { deprecated, _keyFor } = require('./logging')
const path = require('path')
const { EOL } = require('node:os')
const { camelSnakeHybrid, configuration } = require('./config')

const EOL2 = EOL + EOL
const toolName = 'cds-typer'
// @ts-expect-error - nope, it is actually there. Types just seem to be out of sync.
const lls = cds.log.levels
const parameterTypes = {
    boolean:
    /**
     * @param {Parameter} props - additional parameter properties
     * @returns {Parameter}
     */
    props => ({...{
        allowed: ['true', 'false'],
        type: 'boolean',
        postprocess: (/** @type {string} */ value) => value === 'true'
    },
    ...props})
}

/**
 * Adds additional properties to the CLI parameter schema.
 * @param {import('./typedefs').config.cli.ParameterSchema } flags - The CLI parameter schema.
 * @returns {import('./typedefs').config.cli.ParameterSchema} - The enriched schema.
 */
const enrichFlagSchema = flags => {
    const flagKeys = Object.keys(flags)
    for (const [key, value] of Object.entries(flags)) {
        /** @type {Parameter} */(value).camel = key;
        /** @type {Parameter} */(value).snake = camelToSnake(key)
    }
    // non-enumerable utilities
    Object.defineProperties(flags, {
        hasFlag: {
            value: (/** @type {string} **/ flag) => Object.values(flags).some(f => f.snake === flag || f.camel === flag)
        },
        keys: {
            value: flagKeys
        }
    })
    return camelSnakeHybrid(flags)
}

/**
 * Parses command line arguments into named and positional parameters.
 * Named parameters are expected to start with a double dash (--).
 * If the next argument `B` after a named parameter `A` is not a named parameter itself,
 * `B` is used as value for `A`.
 * If `A` and `B` are both named parameters, `A` is just treated as a flag (and may receive a default value).
 * Only named parameters that occur in validFlags are allowed. Specifying named flags that are not listed there
 * will cause an error.
 * Named parameters that are either not specified or do not have a value assigned to them may draw a default value
 * from their definition in validFlags.
 * @param {string[]} argv - list of command line arguments
 * @param {import('./typedefs').config.cli.ParameterSchema} schema - allowed flags. May specify default values.
 * @returns {import('./typedefs').config.cli.ParsedParameters} - parsed arguments
 */
const parseCommandlineArgs = (argv, schema) => {
    const isFlag = (/** @type {string} */ arg) => arg.startsWith('--')
    const positional = []
    /** @type {import('./typedefs').config.cli.ParsedParameters['named']} */
    const named = {}

    let i = 0
    while (i < argv.length) {
        const originalArgName = argv[i]  // so our feedback to the user is less confusing
        let arg = originalArgName
        if (isFlag(arg)) {
            arg = camelToSnake(arg.slice(2))
            // @ts-expect-error - cba to add hasFlag to the general dictionary
            if (!schema.hasFlag(arg)) {
                throw new Error(`invalid named flag '${originalArgName}'`)
            }
            const next = argv[i + 1]
            if (next && !isFlag(next)) {
                named[arg] = { value: next, isDefault: false }
                i++
            } else {
                named[arg] = { value: schema[arg].default, isDefault: true }
            }

            const { allowed, allowedHint } = schema[arg]
            if (allowed && !allowed.includes(named[arg].value)) {
                throw new Error(`invalid value '${named[arg]?.value ?? named[arg]}' for flag ${originalArgName}. Must be one of ${(allowedHint ?? allowed.join(', '))}`)
            }
        } else {
            positional.push(arg)
        }
        i++
    }

    // enrich with defaults
    /** @type {import('./typedefs').config.cli.ParameterSchema} */
    const defaults = Object.entries(schema)
        .filter(e => !!e[1].default)
        .reduce((dict, [k, v]) => {
            // @ts-expect-error - can't infer type of initial {}
            dict[camelToSnake(k)] = { value: v.default, isDefault: true }
            return dict
        }, {})

    const namedWithDefaults = {...defaults, ...named}

    // apply postprocessing
    for (const [key, {value}] of Object.entries(namedWithDefaults)) {
        const { postprocess } = schema[key]
        if (typeof postprocess === 'function') {
            namedWithDefaults[key].value = postprocess(value)
        }
    }

    return {
        named: namedWithDefaults,
        positional,
    }
}

/**
 * Adds CLI parameters to the configuration object.
 * Precedence: CLI > env > default.
 * @param {ReturnType<parseCommandlineArgs>['named']} params - CLI parameters.
 */
const addCLIParamsToConfig = params => {
    for (const [key, value] of Object.entries(params)) {
        if (!value.isDefault || Object.hasOwn(configuration, key)) {
            configuration[key] = value.value
        }
    }
}

const flags = enrichFlagSchema({
    outputDirectory: {
        desc: 'Root directory to write the generated files to.',
        default: './',
        type: 'string'
    },
    help: {
        desc: 'This text.',
    },
    logLevel: {
        desc: `Minimum log level that is printed.${EOL}The default is only used if no explicit value is passed${EOL}and there is no configuration passed via cds.env either.`,
        allowed: Object.keys(lls).concat(Object.keys(deprecated)),
        allowedHint: Object.keys(lls).join(' | '),  // FIXME: remove once old levels are faded out
        defaultHint: _keyFor(lls.ERROR),
        default: cds?.env?.log?.levels?.['cds-typer'] ?? _keyFor(lls.ERROR),
        postprocess: level => {
            const newLogLevel = deprecated[level]
            if (newLogLevel) {
                console.warn(`deprecated log level '${level}', use '${newLogLevel}' instead (changing this automatically for now).`)
                return newLogLevel
            }
            return level
        }
    },
    jsConfigPath: {
        desc: `Path to where the jsconfig.json should be written.${EOL}If specified, ${toolName} will create a jsconfig.json file and${EOL}set it up to restrict property usage in types entities to${EOL}existing properties only.`,
        type: 'string',
        postprocess: file => file && !file.endsWith('jsconfig.json') ? path.join(file, 'jsconfig.json') : path
    },
    useEntitiesProxy: parameterTypes.boolean({
        desc: `If set to true the 'cds.entities' exports in the generated 'index.js'${EOL}files will be wrapped in 'Proxy' objects\nso static import/require calls can be used everywhere.${EOL}${EOL}WARNING: entity properties can still only be accessed after${EOL}'cds.entities' has been loaded`,
        default: 'false'
    }),
    version: {
        desc: 'Prints the version of this tool.'
    },
    inlineDeclarations: {
        desc: `Whether to resolve inline type declarations${EOL}flat: (x_a, x_b, ...)${EOL}or structured: (x: {a, b}).`,
        allowed: ['flat', 'structured'],
        default: 'structured'
    },
    propertiesOptional: parameterTypes.boolean({
        desc: `If set to true, properties in entities are${EOL}always generated as optional (a?: T).`,
        default: 'true'
    }),
    IEEE754Compatible: parameterTypes.boolean({
        desc: `If set to true, floating point properties are generated${EOL}as IEEE754 compatible '(number | string)' instead of 'number'.`,
        default: 'false'
    })
})

const hint = () => 'Missing or invalid parameter(s). Call with --help for more details.'
/**
 * @param {string} s - the string to indent
 * @param {string} indentation - the indentation to use
 */
const indent = (s, indentation) => s
    .split(EOL)
    .map((/** @type {string} */ line) => `${indentation}${line}`)
    .join(EOL)

const help = () => `SYNOPSIS${EOL2}` +
        indent('cds-typer [cds file | "*"]', '  ') + EOL2 +
        indent(`Generates type information based on a CDS model.${EOL}Call with at least one positional parameter pointing${EOL}to the (root) CDS file you want to compile.`, '  ') + EOL2 +
            `OPTIONS${EOL2}` +
            flags.keys
                .sort(([a], [b]) => a.localeCompare(b))
                .map(key => {
                    const value = flags[key]
                    let s = indent(`--${key}`, '  ')
                    const snake = camelToSnake(key)
                    if (key !== snake) s += EOL + indent(`--${snake}`, '  ')
                    // ts-expect-error - not going to check presence of each property. Same for the following expect-errors.
                    if (value.allowedHint) s += ` ${value.allowedHint}`
                    // ts-expect-error
                    else if (value.allowed) s += `: <${value.allowed.join(' | ')}>`
                    else if ('type' in value && value.type) s += `: <${value.type}>`
                    // ts-expect-error
                    if (value.defaultHint || value.default) {
                        s += EOL
                        // ts-expect-error
                        s += indent(`(default: ${value.defaultHint ?? value.default})`, '    ')
                    }
                    s += `${EOL2}${indent(value.desc, '    ')}`
                    return s
                }
                ).join(EOL2)

const version = () => require('../package.json').version

const prepareParameters = (/** @type {any[]} */ argv) => {
    const args = parseCommandlineArgs(argv, flags)

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

    addCLIParamsToConfig(args.named)
    return args
}

const main = async (/** @type {any[]} */ argv) => {
    const { positional } = prepareParameters(argv)
    compileFromFile(positional)
}

if (require.main === module) {
    main(process.argv.slice(2))
}

module.exports = {
    flags,
    prepareParameters
}