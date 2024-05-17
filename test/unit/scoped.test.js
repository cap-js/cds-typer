'use strict'

const { beforeAll, describe, test, expect } = require('@jest/globals')
const { locations, prepareUnitTest } = require('../util')

describe('Scoped Entities', () => {
    let astw

    beforeAll(async () => astw = (await prepareUnitTest('scoped/model.cds', locations.testOutput('scoped_test'))).astw)

    test('Namespace Exists', () => expect(astw.getModuleDeclaration('Name')).toBeTruthy())
    test('Namespace Entity Exists', () => expect(astw.getAspect('_NameAspect')).toBeTruthy())

    test('Entities Present Within Namespace', () => {
        const namespace = astw.getModuleDeclaration('Name')
        expect(namespace).toBeTruthy()
        expect(namespace.body.find(e => e.name === 'Something')).toBeTruthy()
        expect(namespace.body.find(e => e.name === 'Something_')).toBeTruthy()
    })
})