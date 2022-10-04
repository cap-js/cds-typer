/* eslint-disable indent */
// inflection functions are stolen from github/cap/dev/blob/main/etc/inflect.js

const last = /\w+$/

const annotations = {
    singular: '@singular',
    plural: '@plural',
}

const singular4 = (dn, stripped) => {
    let n = dn.name || dn
    if (stripped) {
        n = n.match(last)[0]
    }
    return (
        dn[annotations.singular] ||
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

const plural4 = (dn, stripped) => {
    let n = dn.name || dn
    if (stripped) {
        n = n.match(last)[0]
    }
    return (
        dn[annotations.plural] ||
        (/.*analysis|status|species|news$/i.test(n)
            ? n
            : /.*[^aeiou]y$/.test(n)
            ? n.slice(0, -1) + 'ies'
            : /.*(s|x|z|ch|sh)$/.test(n)
            ? n + 'es'
            : n + 's')
    )
}

const deepMerge = (target, source) => {
    Object.keys(target)
        .filter((k) => k in source)
        .forEach((k) => deepMerge(target[k], source[k]))
    Object.assign(target, source)
}

const parseCommandlineArgs = (argv, validFlags) => {
    const isFlag = (arg) => arg.startsWith('--')
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
            }
        } else {
            positional.push(arg)
        }
        i++
    }

    const defaults = Object.entries(validFlags)
        .filter((e) => !!e[1].default)
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
    singular4,
    plural4,
    parseCommandlineArgs,
    deepMerge,
}
