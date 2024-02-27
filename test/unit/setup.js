const { fs } = require("@sap/cds/lib/utils/cds-utils")
const util = require('../util')

module.exports = () => {
    const base = util.locations.testOutputBase
    try {
        fs.unlinkSync(base)
    } catch (e) { /* also fails on permissions, but still ignore */ }
}