'use strict'

const { describe, it, before } = require('node:test')
const assert = require('assert')
const { locations, prepareUnitTest } = require('../util')
const { checkInheritance, checkDtsInheritance } = require('../ast')
const { perEachTestConfig } = require('../config')
const { configuration } = require('../../lib/config')

perEachTestConfig(({ outputDTsFiles, outputFile }) => {
    describe(`Inheritance (using output **/*/${outputFile} files)`, () => {
        let astw

        before(async () => {
            configuration.outputDTsFiles = outputDTsFiles
            astw = (await prepareUnitTest('inheritance/model.cds', locations.testOutput('inheritance_test'))).astw
        })

        /**
         * Check that the given aspect name inherits from all given ancestors.
         * Handles both .ts (heritage chain) and .d.ts (InstanceType<ReturnType<...>> chain) modes.
         * @param {string} aspectName
         * @param {string[]} ancestors
         * @returns {boolean}
         */
        function checkAspectInheritance(aspectName, ancestors) {
            const aspect = astw.getAspect(aspectName)
            return outputDTsFiles
                ? checkDtsInheritance(aspect, ancestors)
                : checkInheritance(aspect, ancestors)
        }

        it('should verify inheritance for Entity, Type <- Entity', async () => {
            assert.ok(checkAspectInheritance('_LeafEntityAspect', ['_AAspect', '_BAspect', '_TAspect']))
            assert.ok(checkAspectInheritance('_LeafEntityAspect', ['_._ExtEAspect', '_._ExtTAspect']))
            if (!outputDTsFiles) {
                // plural aspect check only meaningful in .ts mode (heritage-based)
                const [leafAspect] = astw.tree.find(n => n.name === '_LeafEntityAspect').body
                assert.ok(!checkInheritance(leafAspect, ['_AAspects']))
            }
            assert.ok(checkAspectInheritance('_LeafEntityAspect', ['_AAspect', '_BAspect', '_TAspect', '_._ExtEAspect', '_._ExtTAspect']))
            // class only extends the aspect
            const leaf = astw.tree.find(n => n.name === 'LeafEntity')
            assert.ok(checkInheritance(leaf, ['_LeafEntityAspect']))
        })

        it('should verify inheritance for Entity, Type <- Type', async () => {
            assert.ok(checkAspectInheritance('_LeafTypeAspect', ['_AAspect', '_BAspect', '_TAspect', '_._ExtEAspect', '_._ExtTAspect']))
            if (!outputDTsFiles) {
                const [leafAspect] = astw.tree.find(n => n.name === '_LeafTypeAspect').body
                assert.ok(!checkInheritance(leafAspect, ['_AAspects']))
            }
            const leaf = astw.tree.find(n => n.name === 'LeafType')
            assert.ok(checkInheritance(leaf, ['_LeafTypeAspect']))
        })

        it('should verify inheritance for Extends Own Aspect (-s, Explicit Annotation)', async () => {
            assert.ok(checkInheritance(astw.tree.find(n => n.name === 'Circus'), ['_CircusAspect']))
        })

        it('should verify inheritance for Extends Own Aspect (-s, No Annotation)', async () => {
            assert.ok(checkInheritance(astw.tree.find(n => n.name === 'Abys'), ['_AbysAspect']))
        })

        it('should verify multilevel inheritance', async () => {
            configuration.outputDTsFiles = outputDTsFiles
            const multilevelAstw = (await prepareUnitTest('inheritance/multilevel.cds', locations.testOutput('inheritance_test_multilevel'))).astw
            if (outputDTsFiles) {
                assert.ok(checkDtsInheritance(multilevelAstw.getAspect('_EAspect'), ['_A2Aspect']))
                assert.ok(checkDtsInheritance(multilevelAstw.getAspect('_A2Aspect'), ['_A1Aspect']))
            } else {
                assert.ok(checkInheritance(multilevelAstw.tree.find(n => n.name === '_EAspect').body[0], ['_A2Aspect']))
                assert.ok(checkInheritance(multilevelAstw.tree.find(n => n.name === '_A2Aspect').body[0], ['_A1Aspect']))
            }
        })
    })
})
