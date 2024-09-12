const { camelToSnake } = require('./util')

/**
 * Makes properties of an object accessible in both camelCase and snake_case.
 * Snake_case gets precedence over camelCase.
 * @template T
 * @param {T} target - The object to proxy.
 * @returns {T} - The proxied object.
 */
const camelSnakeHybrid = target => {
    const proxy = new Proxy(target, {
        get(target, prop) {
            return target[camelToSnake(prop)] ?? target[prop]
        },
        set(target, p, v) {
            target[camelToSnake(p)] = v
            return true
        }
    })
    // need to make sure all properties are initially available in snake_case
    for (const [k,v] of Object.entries(target)) {
        proxy[k] = v
    }
    return proxy
}

/**
 * Adds additional properties to the CLI parameter schema.
 * @param {{ [key: string]: import('./typedefs').config.cli.Parameter }} flags - The CLI parameter schema.
 * @returns {import('./typedefs').config.cli.ParameterSchema} - The enriched schema.
 */
const enrichFlagSchema = flags => {
    for (const [key, value] of Object.entries(flags)) {
        /** @type {import('./typedefs').config.cli.EnrichedParameter} */(value).camel = key;
        /** @type {import('./typedefs').config.cli.EnrichedParameter} */(value).snake = camelToSnake(key)
    }
    // @ts-expect-error
    flags.hasFlag = flag => Object.values(flags).some(f => f.snake === flag || f.camel === flag)
    // @ts-expect-error - ts can't understand the morph from the parameter to the return type by adding properties
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
 * @returns {{ positional: string[], named: { [key: string]: import('./typedefs').config.cli.EffectiveParameter } }} - parsed arguments
 */
const parseCommandlineArgs = (argv, schema) => {
    const isFlag = (/** @type {string} */ arg) => arg.startsWith('--')
    const positional = []
    /** @type {{[key: string]: import('./typedefs').config.cli.EffectiveParameter}} */
    const named = {}

    let i = 0
    while (i < argv.length) {
        const originalArgName = argv[i]  // so our feedback to the user is less confusing
        let arg = originalArgName
        if (isFlag(arg)) {
            arg = camelToSnake(arg.slice(2))
            if (!schema.hasFlag(arg)) {
                throw new Error(`invalid named flag '${arg}'`)
            } else {
                //arg = flagsWithSnakeKeys[arg].canonicalName
                const next = argv[i + 1]
                if (next && !isFlag(next)) {
                    named[arg] = { value: next, isDefault: false }
                    i++
                } else {
                    named[arg] = { value: schema[arg].default, isDefault: true }
                }

                const { allowed, allowedHint } = schema[arg]
                if (allowed && !allowed.includes(named[arg].value)) {
                    throw new Error(`invalid value '${named[arg]}' for flag ${originalArgName}. Must be one of ${(allowedHint ?? allowed.join(', '))}`)
                }
            }
        } else {
            positional.push(arg)
        }
        i++
    }

    // enrich with defaults
    /** @type {{[key: string]: import('./typedefs').config.cli.EffectiveParameter}} */
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
 * @param {ReturnType<parseCommandlineArgs>['named']} params - CLI parameters.
 * @param {{[key: string]: any}} env - cds.env.typer
 * @returns {{[key: string]: any}} merged parameters
 */
const paramsPlusEnv = (params, env) => camelSnakeHybrid({
    ...Object.entries(params).reduce((acc, [k, v]) => {
        if (v.isDefault) acc[k] = v.value
        return acc
    }, {}),
    ...env,
    ...Object.entries(params).reduce((acc, [k, v]) => {
        if (!v.isDefault) acc[k] = v.value
        return acc
    }, {})
})

const parameterTypes = {
    boolean:
    /**
     * @param {import('./typedefs').config.cli.Parameter} props
     * @returns {import('./typedefs').config.cli.Parameter}
     */
    props => ({...{
        allowed: ['true', 'false'],
        type: 'boolean',
        postprocess: (/** @type {string} */ value) => value === 'true'
    },
    ...props})
}

module.exports = {
    camelSnakeHybrid,
    enrichFlagSchema,
    parseCommandlineArgs,
    paramsPlusEnv,
    parameterTypes
}