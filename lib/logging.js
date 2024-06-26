const cds = require('@sap/cds')

const _keyFor = value => Object.entries(cds.log.levels).find(([,val]) => val === value)?.[0]

// workaround until retroactively setting log level to 0 is possible
cds.log('cds-typer', _keyFor(cds.log.levels.SILENT))
module.exports = {
    _keyFor,
    setLevel: level => { cds.log('cds-typer', level) },
    deprecated: {
        WARNING: 'WARN',
        CRITICAL: 'ERROR',
        NONE: 'SILENT'
    },
    get LOG () { return cds.log('cds-typer') }
}
