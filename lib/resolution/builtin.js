class BuiltinResolver {
    /**
     * Builtin types defined by CDS.
     */
    /** @type {Record<string, string>} */
    #builtins = {
        UUID: 'string',
        String: 'string',
        Binary: 'string',
        LargeString: 'string',
        LargeBinary: 'Buffer | string | {value: import("stream").Readable, $mediaContentType: string, $mediaContentDispositionFilename?: string, $mediaContentDispositionType?: string}',
        Vector: 'string',
        Integer: 'number',
        UInt8: 'number',
        Int16: 'number',
        Int32: 'number',
        Int64: 'number',
        Integer64: 'number',
        Decimal: 'number',
        DecimalFloat: 'number',
        Float: 'number',
        Double: 'number',
        Boolean: 'boolean',
        // note: the date-related types are strings on purpose, which reflects their runtime behaviour
        Date: '__.CdsDate',  // yyyy-mm-dd
        DateTime: '__.CdsDateTime', // yyyy-mm-dd + time + TZ (precision: seconds)
        Time: '__.CdsTime',  // hh:mm:ss
        Timestamp: '__.CdsTimestamp', // yyy-mm-dd + time + TZ (ms precision)
        //
        Composition: 'Array',
        Association: 'Array'
    }

    /**
     * @param {object} options - additional resolution options
     * @param {boolean} [options.IEEE754Compatible] - if true, the Decimal, DecimalFloat, Float, and Double types are also allowed to be strings
     */
    constructor ({ IEEE754Compatible } = {}) {
        if (IEEE754Compatible) {
            this.#builtins.Decimal = '(number | string)'
            this.#builtins.DecimalFloat = '(number | string)'
            this.#builtins.Float = '(number | string)'
            this.#builtins.Double = '(number | string)'
        }
        this.#builtins = Object.freeze(this.#builtins)
    }

    /**
     * @param {string | string[] | import("@sap/cds").ref} t - name or parts of the type name split on dots
     * @returns {string | undefined | false} if t refers to a builtin, the name of the corresponding TS type is returned.
     *   If t _looks like_ a builtin (`cds.X`), undefined is returned.
     *   If t is obviously not a builtin, false is returned.
     */
    resolveBuiltin (t) {
        if (!Array.isArray(t) && typeof t !== 'string') return false
        const path = Array.isArray(t) ? t : t.split('.')
        return path.length === 2 && path[0] === 'cds'
            ? this.#builtins[path[1]]
            : false
    }
}

module.exports = {
    BuiltinResolver
}