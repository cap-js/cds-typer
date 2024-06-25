const cds = require('@sap/cds')

/** @enum {number} */
const Levels = {
    TRACE: 1,
    DEBUG: 2,
    INFO: 3,
    WARNING: 4,
    ERROR: 8,
    CRITICAL: 16,
    NONE: 32,
}

const LOG = cds.log('cds-typer')
module.exports = {
    Levels,
    warn: LOG.warn,
    error: LOG.error,
    debug: LOG.debug,
}
