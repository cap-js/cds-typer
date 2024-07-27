const { utils: { fs } } = require('@sap/cds')
const util = require('../util')

module.exports = () => {
    const base = util.locations.smoke.base

    try {
        fs.unlinkSync(base)
    // eslint-disable-next-line no-unused-vars
    } catch (_) { /* also fails on permissions, but still ignore */ }
}