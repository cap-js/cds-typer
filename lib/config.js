const fs = require('node:fs')
const path = require('node:path')
const cds = require('@sap/cds')
const { camelToSnake, getProjectTargetType } = require('./util')
const { LOG } = require('./logging')

/**
 * Makes properties of an object accessible in both camelCase and snake_case.
 * Snake_case gets precedence over camelCase.
 * @template T
 * @param {T} target - The object to proxy.
 * @returns {T} - The proxied object.
 */
const camelSnakeHybrid = target => {
    // @ts-expect-error - expecting target to be of type {}, which is not T (same for following)
    const proxy = new Proxy(target, {
        get(target, prop) {
            // @ts-expect-error
            return target[camelToSnake(prop)] ?? target[prop]
        },
        set(target, p, v) {
            // @ts-expect-error
            target[camelToSnake(p)] = v
            return true
        }
    })
    // need to make sure all properties are initially available in snake_case
    // @ts-expect-error
    for (const [k,v] of Object.entries(target)) {
        // @ts-expect-error
        proxy[k] = v
    }
    // @ts-expect-error
    return proxy
}
class Config {
    /** @type {Record<string, unknown>} */
    static #defaults = {}
    static get defaults () {
        // these are the exact defaults that are used when cds-typer is loaded as cds plugin
        // which will shove the values into cds.env. When executed standalone, without cds environment,
        // we need to load them from package.json ourselves.
        if (Object.keys(Config.#defaults).length) return Config.#defaults
        try {
            const packageJsonPath = path.resolve(__dirname, path.join('..', 'package.json'))
            const pjson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'))
            Config.#defaults = pjson.cds.typer
        } catch (e) {
            LOG.error(`Failed to load default configuration from package.json: ${e}`)
        }
        return Config.#defaults
    }

    values = undefined
    proxy = undefined

    init () {
        this.values = {...Config.defaults, ...(cds.env.typer ?? {})}
        this.proxy = camelSnakeHybrid(this.values)
        if (this.proxy.targetModuleType === 'auto') {
            const type = getProjectTargetType(cds.root)
            if (type) {
                LOG.info(`automatically detected module type '${type}' in ${cds.root}`)
                this.values.targetModuleType = type
            } else {
                LOG.warn(`target module type was set to 'auto', but could not detect module type in ${cds.root}. Falling back to cjs`)
                this.values.targetModuleType = 'cjs'
            }
        }
    }

    constructor() {
        // proxy around config still allows arbitrary property access:
        // require('config').configuration.logLevel = 'warn' will work
        // eslint-disable-next-line no-constructor-return
        return new Proxy(this, {
            get(target, prop) {
                // lazy loading of cds.env
                // if we don't do this, configuration will load cds.env whenever it is
                // first imported anywhere (even by proxy from, say, cli.js).
                // So we don't get to modify cds.env before that, which is important
                // in cds-build.js.
                // FIXME: revisit. This is horrible.
                if (target.values === undefined) target.init()
                return target[prop] ?? target.proxy[prop]
            },
            set(target, p, v) {
                if (target.values === undefined) target.init()

                // this.value, this.proxy etc should not be forwarded to the wrapped values
                if (target[p]) {
                    target[p] = v
                } else {
                    target.proxy[p] = v
                }
                return true
            }
        })
    }

    /**
     * @param {string} key - The key to set.
     * @param {any} value - The value to set
     */
    setOne (key, value) {
        this.proxy[key] = value
    }

    /**
     * @param {object} props - The properties to set.
     */
    setMany (props) {
        for (const [k,v] of Object.entries(props)) {
            this.proxy[k] = v
        }
    }

    /**
     * Resets the config value and sets all its values from another passed
     * config object. This allows to keep the reference to the same object.
     * @param {Config} config - Another config object to set all config entries from.
     */
    setFrom (config) {
        this.values = camelSnakeHybrid({})
        this.setMany(config.values)
    }

    clone () {
        const res = new Config()
        res.init()
        res.setMany(this.values)
        return res
    }
}

module.exports = {
    camelSnakeHybrid,
    /** @type {import('./typedefs').config.Configuration} */
    // @ts-ignore
    configuration: new Config()
}
