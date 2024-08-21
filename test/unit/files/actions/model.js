const cds = require('@sap/cds')

// import S2 from '#cds-models/actions_test/S2'
// const S2 = require('#cds-models/actions_test/S2')

const {S2} = require('#cds-models/actions_test/S2')
const S2_D = require('#cds-models/actions_test/S2')

if (S2 !== S2_D)  throw new Error('Different exports')

module.exports = class S extends cds.ApplicationService { async init(){

    if (this.name !== 'actions_test.S2') { // make sure not to connect to the same service
        const s2 = await cds.connect.to(S2)
        const s2_d = await cds.connect.to(S2_D)
        await s2.a1({p1: '', p2: [ { extType2: 1 } ]})
    }


    return super.init()
}}
