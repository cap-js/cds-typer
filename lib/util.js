/** @typedef { import('./typedefs').util.Annotations} Annotations */
/** @typedef { import('./typedefs').util.CommandLineFlags } CommandlineFlag */
/** @typedef { import('./typedefs').util.ParsedFlag } ParsedFlags */

// inflection functions are stolen from github/cap/dev/blob/main/etc/inflect.js

// MONKEY PATCH to support Node v14
// Remove at end of LTE period.
if (process.version.startsWith('v14')) {
    // eslint-disable-next-line no-prototype-builtins
    Object.hasOwn = Object.hasOwn ?? ((obj, attr) => Boolean(obj && obj.hasOwnProperty(attr)))
}

const last = /\w+$/

const annotations = {
    singular: ['@singular'],
    plural: ['@plural'],
}

/**
 * Tries to retrieve an annotation that specifies the singular name
 * from a CSN. Valid annotations are listed in util.annotations
 * and their precedence is in order of definition.
 * If no singular is specified at all, undefined is returned.
 * @param {object} csn - the CSN of an entity to check
 * @returns {string | undefined} the singular annotation or undefined
 */
const getSingularAnnotation = csn => csn[annotations.singular.find(a => Object.hasOwn(csn, a))]

/**
 * Tries to retrieve an annotation that specifies the plural name
 * from a CSN. Valid annotations are listed in util.annotations
 * and their precedence is in order of definition.
 * If no plural is specified at all, undefined is returned.
 * @param {object} csn - the CSN of an entity to check
 * @returns {string | undefined} the plural annotation or undefined
 */
const getPluralAnnotation = csn => csn[annotations.plural.find(a => Object.hasOwn(csn, a))]

/**
 * Users can specify that they want to refer to localisation
 * using the syntax {i18n>Foo}, where Foo is the name of the
 * entity as found in the .cds file
 * (see: https://pages.github.tools.sap/cap/docs/guides/i18n)
 * As this throws off the naming, we remove this wrapper
 * unlocalize("{i18n>Foo}") -> "Foo"
 * @param {string} name - the entity name (singular or plural).
 * @returns {string} the name without localisation syntax or untouched.
 * @deprecated we have dropped this feature altogether, users specify custom names via @singular/@plural now
 */
const unlocalize = name => {
    const match = name.match(/\{i18n>(.*)\}/)
    return match ? match[1] : name
}

/**
 * Attempts to derive the singular form of an English noun.
 * If '@singular' is passed as annotation, that is preferred.
 * @param {Annotations} dn - annotations
 * @param {boolean?} stripped - if true, leading namespace will be stripped
 */
const singular4 = (dn, stripped = false) => {
    let n = dn.name || dn
    if (stripped) {
        n = n.match(last)[0]
    }
    return (
        getSingularAnnotation(dn) ??
        (/.*species|news$/i.test(n)
            ? n
            : /.*ess$/.test(n)
                ? n // Address
                : /.*ees$/.test(n)
                    ? n.slice(0, -1) // Employees --> Employee
                    : /.*[sz]es$/.test(n)
                        ? n.slice(0, -2)
                        : /.*[^aeiou]ies$/.test(n)
                            ? n.slice(0, -3) + 'y' // Deliveries --> Delivery
                            : /.*s$/.test(n)
                                ? n.slice(0, -1)
                                : /.*_$/.test(n) // special cdstyper case where we revert the _ suffix for when a plural can not be determined
                                    ? n.slice(0, -1)
                                    : n
        )
    )
}

/**
 * Attempts to derive the plural form of an English noun.
 * If '@plural' is passed as annotation, that is preferred. 
 * @param {Annotations} dn - annotations
 * @param {boolean} stripped - if true, leading namespace will be stripped
 */
const plural4 = (dn, stripped) => {
    let n = dn.name || dn
    if (stripped) {
        n = n.match(last)[0]
    }
    return (
        getPluralAnnotation(dn) ??
        (/.*analysis|status|species|news$/i.test(n)
            ? n
            : /.*[^aeiou]y$/.test(n)
                ? n.slice(0, -1) + 'ies'
                : /.*(s|x|z|ch|sh)$/.test(n)
                    ? n + 'es'
                    : n + 's')
    )
}

/**
 * Performs a deep merge of the passed objects into the first object. 
 * See Object.assign(target, source).
 * @param {object} target - object to assign into.
 * @param {object} source - object to assign from.
 */
const deepMerge = (target, source) => {
    Object.keys(target)
        .filter(k => k in source)
        .forEach(k => { deepMerge(target[k], source[k]) })
    Object.assign(target, source)
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
 * @param {{[key: string]: CommandlineFlag}} validFlags - allowed flags. May specify default values.
 * @returns {ParsedFlags}
 */
const parseCommandlineArgs = (argv, validFlags) => {
    const isFlag = arg => arg.startsWith('--')
    const positional = []
    const named = {}

    let i = 0
    while (i < argv.length) {
        let arg = argv[i]
        if (isFlag(arg)) {
            arg = arg.slice(2)
            if (!(arg in validFlags)) {
                throw new Error(`invalid named flag '${arg}'`)
            } else {
                const next = argv[i + 1]
                if (next && !isFlag(next)) {
                    named[arg] = next
                    i++
                } else {
                    named[arg] = validFlags[arg].default
                }

                const { allowed, allowedHint } = validFlags[arg]
                if (allowed && !allowed.includes(named[arg])) {
                    throw new Error(`invalid value '${named[arg]}' for flag ${arg}. Must be one of ${(allowedHint ?? allowed.join(', '))}`)
                }
            }
        } else {
            positional.push(arg)
        }
        i++
    }

    const defaults = Object.entries(validFlags)
        .filter(e => !!e[1].default)
        .reduce((dict, [k, v]) => {
            dict[k] = v.default
            return dict
        }, {})

    return {
        named: Object.assign(defaults, named),
        positional,
    }
}

module.exports = {
    annotations,
    getSingularAnnotation,
    getPluralAnnotation,
    unlocalize,
    singular4,
    plural4,
    parseCommandlineArgs,
    deepMerge
}
