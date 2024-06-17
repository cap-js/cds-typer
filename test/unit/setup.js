const { fs } = require('@sap/cds/lib/utils/cds-utils')
const util = require('../util')

module.exports = () => {
    const base = util.locations.unit.base

    try {
        fs.unlinkSync(base)
    // eslint-disable-next-line no-unused-vars        
    } catch (_) { /* also fails on permissions, but still ignore */ }
}