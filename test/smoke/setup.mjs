import * as cds from '@sap/cds'
import * as util from '../util.js'

const base = util.locations.smoke.base

try {
    cds.utils.fs.unlinkSync(base)
// eslint-disable-next-line no-unused-vars
} catch (_) { /* also fails on permissions, but still ignore */ }