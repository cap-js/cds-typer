const cds = require('@sap/cds')

// workaround until retroactively setting log level to 0 is possible
cds.log('cds-typer', 'SILENT')
module.exports = {
    _keyFor: value => Object.entries(cds.log.levels).find(([,val]) => val === value)?.[0],
    setLevel: level => { cds.log('cds-typer', level) },
    deprecated: {
        WARNING: 'WARN',
        CRITICAL: 'ERROR',
        NONE: 'SILENT'
    },
    get LOG () { return cds.log('cds-typer') }
}
