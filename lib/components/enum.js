const { normalise } = require('./identifier')

/**
 * Extracts all unique values from a list of enum key-value pairs.
 * If the value is an object, then the `.val` property is used.
 * @param {[string, any | {val: any}][]} kvs - key value pairs
 */
const uniqueValues = kvs => new Set(kvs.map(([,v]) => v?.val ?? v))  // in case of wrapped vals we need to unwrap here for the type

/**
 * Stringifies a list of enum key-value pairs into the righthand side of a TS type.
 * @param {[string, string][]} kvs - list of key-value pairs
 * @returns {string} a stringified type
 * @example
 * ```js
 * ['A', 'B', 'A'] // -> '"A" | "B"'
 * ```
 */
const stringifyEnumType = kvs => [...uniqueValues(kvs)].join(' | ')

// in case of strings, wrap in quotes and fallback to key to make sure values are attached for every key
/**
 * @param {string} key - the key of the enum
 * @param {any} value - the value of the enum
 * @param {string | import('../typedefs').resolver.ref} enumType - the type of the enum
 */
const enumVal = (key, value, enumType) => enumType === 'cds.String' ? JSON.stringify(`${value ?? key}`) : value

/**
 * Prints an enum to a buffer. To be precise, it prints
 * a constant object and a type which together form an artificial enum.
 * CDS enums differ from TS enums as they can use bools as value (TS: only number and string)
 * So we have to emulate enums by adding an object (name -> value mappings)
 * and a type containing all disctinct values.
 * We can get away with this as TS doesn't feature nominal typing, so the structure
 * is all we care about.
 * @example
 * ```cds
 * type E: enum of String {
 *   a = 'A';
 *   b = 'B';
 * }
 * ```
 * becomes
 * ```ts
 * const E = { a: 'A', b: 'B' }
 * type E = 'A' | 'B'
 * ```
 * @param {import('../file').Buffer} buffer - Buffer to write into
 * @param {string} name - local name of the enum, i.e. the name under which it should be created in the .ts file
 * @param {[string, string][]} kvs - list of key-value pairs
 * @param {object} options - options for printing the enum
 * @param {string[]} doc - the enum docs
 */
function printEnum(buffer, name, kvs, options = {}, doc=[]) {
    const opts = {...{export: true}, ...options}
    buffer.add('// enum')
    if (opts.export) doc.forEach(d => { buffer.add(d) })
    buffer.addIndentedBlock(`${opts.export ? 'export ' : ''}const ${name} = {`, () =>
        kvs.forEach(([k, v]) => { buffer.add(`${normalise(k)}: ${v},`) })
    , '} as const;')
    buffer.add(`${opts.export ? 'export ' : ''}type ${name} = ${stringifyEnumType(kvs)}`)
    buffer.add('')
}

/**
 * Converts a CSN type describing an enum into a list of kv-pairs.
 * Values from CSN are unwrapped from their `.val` structure and
 * will fall back to the key if no value is provided.
 * @param {import('../typedefs').resolver.EnumCSN} enumCsn - the CSN type describing the enum
 * @param {{unwrapVals: boolean} | {}} options - if `unwrapVals` is passed,
 *  then the CSN structure `{val:x}` is flattened to just `x`.
 *  Retaining `val` is closer to the actual CSN structure and should be used where we want
 *  to mimic the runtime as closely as possible (inline enum types).
 *  Stripping that additional wrapper would be more readable for users.
 * @returns {[string, any][]}
 * @example
 * ```ts
 * const csn = {enum: {X: {val: 'a'}, Y: {val: 'b'}, Z: {}}}
 * csnToEnumPairs(csn) // -> [['X', 'a'], ['Y': 'b'], ['Z': 'Z']]
 * csnToEnumPairs(csn, {unwrapVals: false}) // -> [['X', {val:'a'}], ['Y': {val:'b'}], ['Z':'Z']]
 * ```
 */
const csnToEnumPairs = ({enum: enm, type}, options = {}) => {
    const actualOptions = {...{unwrapVals: true}, ...options}
    return Object.entries(enm).map(([k, v]) => {
        const val = enumVal(k, v.val, type)
        return [k, (actualOptions.unwrapVals ? val : { val })]
    })
}

/**
 * @param {string} entity - the entity to which the property belongs
 * @param {string} property - the property name
 */
const propertyToInlineEnumName = (entity, property) => `${entity}_${property}`

/**
 * A type is considered to be an inline enum, iff it has a `.enum` property
 * _and_ its type is a CDS primitive, i.e. it is not contained in `cds.definitions`.
 * If it is contained there, then it is a standard enum declaration that has its own name.
 * @param {{type: string | import('../typedefs').resolver.ref, [key: string]: any}} element - the element to check
 * @param {import('../typedefs').resolver.CSN} csn - the CSN model
 * @returns {element is import('../typedefs').resolver.EnumCSN}
 */
const isInlineEnumType = (element, csn) => element.enum
    && !(typeof element.type === 'string' && element.type in csn.definitions)

/**
 * Stringifies an enum into a runtime artifact.
 * ```cds
 * type Language: String enum {
 *   DE = "German";
 *   EN = "English";
 *   FR;
 * }
 * ```
 * becomes
 *
 * ```js
 * module.exports.Language = { DE: "German", EN: "English", FR: "FR" }
 * ```
 * @param {string} name - the enum name
 * @param {[string, string][]} kvs - a list of key-value pairs. Values that are falsey are replaced by
 */
// ??= for inline enums. If there is some static property of that name, we don't want to override it (for example: ".actions"
const stringifyEnumImplementation = (name, kvs) => `module.exports.${name} ??= { ${kvs.map(([k,v]) => `${normalise(k)}: ${v}`).join(', ')} }`


module.exports = {
    printEnum,
    csnToEnumPairs,
    propertyToInlineEnumName,
    isInlineEnumType,
    stringifyEnumImplementation,
    stringifyEnumType
}