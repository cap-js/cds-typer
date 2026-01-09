const { createHash } = require('node:crypto')

// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Lexical_grammar
const JS_RESERVED = new Set([
    'abstract',
    'arguments',
    'await',
    'boolean',
    'break',
    'byte',
    'case',
    'catch',
    'char',
    'class',
    'const',
    'continue',
    'debugger',
    'default',
    'delete',
    'do',
    'double',
    'else',
    'enum',
    'eval',
    'export',
    'extends',
    'false',
    'final',
    'finally',
    'float',
    'for',
    'function',
    'goto',
    'if',
    'implements',
    'import',
    'in',
    'instanceof',
    'int',
    'interface',
    'let',
    'long',
    'native',
    'new',
    'null',
    'object',
    'package',
    'private',
    'protected',
    'public',
    'return',
    'short',
    'static',
    'super',
    'switch',
    'synchronized',
    'this',
    'throw',
    'throws',
    'transient',
    'true',
    'try',
    'typeof',
    'var',
    'void',
    'volatile',
    'while',
    'with',
    'yield',
])

const isValidIdent = /^[_$a-zA-Z][$\w]*$/

/**
 * Enquotes an identifier to a valid JavaScript identifier.
 * I.e. either the identifier itself or a quoted string.
 * @param {string} ident - the identifier to enquote
 * @returns {string} the enquoted identifier
 */
const enquote = ident => ident && !isValidIdent.test(ident)
    ? `"${ident}"`
    : ident

/**
 * Returns the last part of a dot-separated identifier.
 * @param {string} ident - the identifier to extract the last part from
 * @returns {string} the last part of the identifier
 */
const last = ident => ident.split('.').at(-1) ?? ident

// FIXME: delete?
class Identifier {
    #singular
    #plural
    /** @type {Identifier | null} */
    from = null
    /** @type {string[]} */
    #scope = []
    #isNormalised = false

    get singular () {
        return this.#singular
    }

    get scopedSingular () {
        return [...this.#scope, this.#singular].join('.')
    }

    get scopedPlural () {
        return [...this.#scope, this.#plural].join('.')
    }

    get plural () {
        return this.#plural
    }

    /** @returns {Identifier} */
    get normalised () {
        return this.#isNormalised
            ? this
            : new Identifier(
                normalise(this.singular).normalised,
                normalise(this.plural).normalised,
                {
                    from: this,
                    scope: this.#scope,
                    isNormalised: true
                })
    }

    /**
     * @param {string} singular - singular name
     * @param {string} plural - plural name
     * @param {{from?: Identifier | null, scope?: string[], isNormalised?: boolean}} [options] - options
     */
    constructor(singular, plural, {from = null, scope = [], isNormalised = false} = {}) {
        this.#singular = singular
        this.#plural = plural
        this.from = from
        this.#scope = scope
        this.#isNormalised = isNormalised
    }
}

/**
 * Normalises the name of a service or entity.
 * This function is suited to normalise class names.
 * To handle properties with exotic characters, see {@link enquote}.
 * @param {string} name - name of the entity or fq thereof.
 */
const normalise = name => {
    const namespace = name.split('.').slice(0, -1)
    const unqualified = /** @type {string} */ (name.split('.').at(-1))
    let normalised = unqualified.match(/^[a-zA-Z]+\w*$/)
        ? unqualified
        : `__${unqualified.replaceAll(/[^a-zA-Z0-9]/g, '_')}`
    if (/^_+$/.test(normalised)) {
        // very rare case when the entire name consists of non-alphanumeric characters (Kanji, etc)
        // That would leave us with just underscores,
        // which has high potential of colliding with other such names
        // -> fall back to hash. Hashes still bear a small risk of collision, but much lower.
        normalised = createHash('md5').update(name).digest('hex')
    }
    if (JS_RESERVED.has(normalised)) {
        normalised = `__${name}`
    }
    return {
        original: name,
        unqualified,
        normalised: [...namespace, normalised].filter(Boolean).join('.'),
        wasNormalised: unqualified !== normalised
    }
}

class Inflection {
    identifier
    /** @type {string[]} */
    scope = []
    /** @type {Inflection | null} */
    #from = null
    /** @type {Inflection | undefined} */
    #normalised

    get #isNormalised () {
        return Boolean(this.#from)
    }

    /**
     * @returns {Inflection}
     */
    get normalised () {
        return this.#isNormalised
            ? this
            : this.#normalised ??= new Inflection(normalise(this.identifier).normalised, this.scope, this)
    }

    /**
     * @param {string} identifier - the inflectedidentifier
     * @param {string[]} [scope=[]] - the scope of the identifier
     * @param {Inflection | null} [from=null] - the original inflection if this is a normalised one
     */
    constructor (identifier, scope = [], from = null) {
        this.identifier = identifier
        this.scope = scope
        this.#from = from
    }
}

module.exports = {
    enquote,
    last,
    normalise
}
