const cds = require('@sap/cds')

/** @param {string} value - the value */
// @ts-expect-error - yes, cds.log.levels exists...
const _keyFor = value => Object.entries(cds.log.levels).find(([,val]) => val === value)?.[0]

// workaround until retroactively setting log level to 0 is possible
// @ts-expect-error - yes, cds.log.levels exists...
cds.log('cds-typer', _keyFor(cds.log.levels.SILENT))
module.exports = {
    _keyFor,
    setLevel: (/** @type {string | number} */ level) => { cds.log('cds-typer', level) },
    /** @type {Record<string, string>} */
    deprecated: {
        WARNING: 'WARN',
        CRITICAL: 'ERROR',
        NONE: 'SILENT'
    },
    get LOG () { return cds.log('cds-typer') }
}
