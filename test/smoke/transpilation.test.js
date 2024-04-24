'use strict'

const fs = require('fs')
const path = require('path')
const { describe, beforeAll, test, expect } = require('@jest/globals')
const { checkFunction, check, ASTWrapper, checkKeyword } = require('../ast')
const { locations, prepareUnitTest } = require('../util')


const modelDirs = fs.readdirSync(locations.smoke.files(''))
    .map(dir => ({ name: dir, directory: locations.smoke.files(dir) }))

describe('smoke', () => {
    describe('transpilation', () => {
        test.each(modelDirs)('$name', ({ directory }) => {
            prepareUnitTest(directory)
            typerOptions = {}, fileSelector = paths => paths.find(p => !p.endsWith('_')), transpilationCheck = false
        })
    })
})
