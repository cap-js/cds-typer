'use strict'

const { compile, compileFromFile } = require('./lib/compile')
const { parseCommandlineArgs } = require('./lib/util')
const { Levels } = require('./lib/logging')
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
}

const hint = () => console.log('Missing or invalid parameter(s). Call with --help for more details.')

const help = () =>
    console.log(
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

const main = async (args) => {
    if ('help' in args.named) {
        help()
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
    compileFromFile(args.positional[0], {
        rootDirectory: args.named.rootDir,
        logLevel: Levels[ll],
        jsConfigPath: args.named.jsConfigPath,
    })
}

if (require.main === module) {
    main(parseCommandlineArgs(process.argv.slice(2), flags))
}
