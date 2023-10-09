/**
 * Prints an enum to a buffer. To be precise, it prints
 * a constant object and a type which together form an artificial enum.
 * CDS enums differ from TS enums as they can use bools as value (TS: only number and string)
 * So we have to emulate enums by adding an object (name -> value mappings)
 * and a type containing all disctinct values.
 * We can get away with this as TS doesn't feature nominal typing, so the structure
 * is all we care about.
 * 
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
 *
 * @param {Buffer} buffer Buffer to write into
 * @param {string} name local name of the enum
 * @param {[string, string][]} kvs list of key-value pairs
 */
function printEnum(buffer, name, kvs, options = {}) {
    const opts = {...{export: true}, ...options} 
    buffer.add('// enum')
    buffer.add(`${opts.export ? 'export ' : ''}const ${name} = {`)
    buffer.indent()
    const vals = new Set()
    for (const [k, v] of kvs) {
        buffer.add(`${k}: ${JSON.stringify(v)},`)
        vals.add(JSON.stringify(v.val ?? v))  // in case of wrapped vals we need to unwrap here for the type
    }
    buffer.outdent()
    buffer.add('} as const;')
    buffer.add(`${opts.export ? 'export ' : ''}type ${name} = ${[...vals].join(' | ')}`)
    buffer.add('')
}

// in case of strings, wrap in quotes and fallback to key to make sure values are attached for every key
const enumVal = (key, value, enumType) => enumType === 'cds.String' ? `${value ?? key}` : value

/**
 * @param {{enum: {[key: name]: string}, type: string}} enumCsn
 * @param {{unwrapVals: boolean}} options if `unwrapVals` is passed,
 *  then the CSN structure `{val:x}` is flattened to just `x`.
 *  Retaining `val` is closer to the actual CSN structure and should be used where we want
 *  to mimic the runtime as closely as possible (anoymous enum types).
 *  Stripping that additional wrapper would be more readable for users.
 * @example
 * ```ts 
 * const csn = {enum: {x: {val: 42}, y: {val: -42}}}
 * csnToEnum(csn) // -> [['x', 42], ['y': -42]]
 * csnToEnum(csn, {unwrapVals: false}) // -> [['x', {val:42}], ['y': {val:-42}]]
 * ```
 */
const csnToEnum = ({enum: enm, type}, options = {}) => {
    options = {...{unwrapVals: true}, ...options}
    return Object.entries(enm).map(([k, v]) => {
        const val = enumVal(k, v.val, type)
        return [k, options.unwrapVals ? val : { val }]
    })
}

/**
 * 
 */
const propertyToInlineEnumName = (entity, property) => `${entity}_${property}`

            // if the type is in csn.definitions, then it's actually referring
            // to an external enum. Those are handled elsewhere.
/**
 * A type is considered to be an inline enum, iff it has a `.enum` property
 * _and_ its type is a CDS primitive, i.e. it is not contained in `cds.definitions`.
 * If it is contained there, then it is a standard enum declaration that has its own name.
 * 
 * @param {{type: string}} element
 * @param {object} csn
 * @returns boolean
 */
const isInlineEnumType = (element, csn) => element.enum && !(element.type in csn.definitions)

module.exports = {
    printEnum,
    csnToEnum,
    propertyToInlineEnumName,
    isInlineEnumType
}