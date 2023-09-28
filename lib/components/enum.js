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
        buffer.add(`${k}: ${v},`)
        vals.add(v)
    }
    buffer.outdent()
    buffer.add('}')
    buffer.add(`${opts.export ? 'export ' : ''}type ${name} = ${[...vals].join(' | ')}`)
    buffer.add('')
}

// in case of strings, wrap in quotes and fallback to key to make sure values are attached for every key
const enumVal = (key, value, enumType) => enumType === 'cds.String' ? `"${value ?? key}"` : value

/**
 * @param { {enum: {[key: name]: string}, type: string}} enumCsn
 */
const csnToEnum = ({enum: enm, type}) => Object.entries(enm).map(([k, v]) => [k, enumVal(k, v.val, type)])

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