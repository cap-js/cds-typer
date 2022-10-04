'use strict'

const fs = require('fs')
const path = require('path')
const { validateDTSTypes } = require('./util')

const dir = './__tests__/files'

// all .js files of the lib have proper .ts files
describe('Proper Typings', () => {
    test('lib/compile', () => validateDTSTypes('./lib/compile', { js: ['erase'] }))
    test('lib/file', () => validateDTSTypes('./lib/file'))
    test('lib/logging', () =>
        validateDTSTypes('./lib/logging', { ts: ['trace', 'debug', 'info', 'warning', 'error', 'critical'] }))
    test('lib/util', () => validateDTSTypes('./lib/util', { js: ['isFlag'] }))
})
