'use strict'

const fs = require('fs')
const cds2ts = require('../../lib/compile')
const { toHaveAll, toOnlyHave, toExactlyHave } = require('../util')
const { locations } = require('../util')

const dir = locations.testOutput('compilation')

expect.extend({ toHaveAll, toOnlyHave, toExactlyHave })

// compilation produces semantically complete Typescript
describe('Compilation', () => {
    beforeEach(() => {
        try {
            fs.unlinkSync(dir)
        } catch (err) {
            //console.log('INFO', `Unable to unlink '${dir}' (${err}). This may not be an issue.`)
        }
    })
})
