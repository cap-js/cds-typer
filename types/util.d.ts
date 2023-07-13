export type Annotations = {
    name?: string;
    '@singular'?: string;
    '@plural'?: string;
};
export type CommandlineFlag = {
    desc: string;
    default?: any;
};
export type ParsedFlags = {
    positional: string[];
    named: {
        [x: string]: any;
    };
};
export namespace annotations {
    let singular: string[];
    let plural: string[];
}
/**
 * Tries to retrieve an annotation that specifies the singular name
 * from a CSN. Valid annotations are listed in util.annotations
 * and their precedence is in order of definition.
 * If no singular is specified at all, undefined is returned.
 * @param {Object} csn the CSN of an entity to check
 * @returns {string | undefined} the singular annotation or undefined
 */
export function getSingularAnnotation(csn: any): string | undefined;
/**
 * Tries to retrieve an annotation that specifies the plural name
 * from a CSN. Valid annotations are listed in util.annotations
 * and their precedence is in order of definition.
 * If no plural is specified at all, undefined is returned.
 * @param {Object} csn the CSN of an entity to check
 * @returns {string | undefined} the plural annotation or undefined
 */
export function getPluralAnnotation(csn: any): string | undefined;
/**
 * Users can specify that they want to refer to localisation
 * using the syntax {i18n>Foo}, where Foo is the name of the
 * entity as found in the .cds file
 * (see: https://pages.github.tools.sap/cap/docs/guides/i18n)
 * As this throws off the naming, we remove this wrapper
 * unlocalize("{i18n>Foo}") -> "Foo"
 * @param {string} name the entity name (singular or plural).
 * @returns {string} the name without localisation syntax or untouched.
 */
export function unlocalize(name: string): string;
/**
 * Attempts to derive the singular form of an English noun.
 * If '@singular' is passed as annotation, that is preferred.
 * @param {Annotations} dn annotations
 * @param {boolean?} stripped if true, leading namespace will be stripped
 */
export function singular4(dn: Annotations, stripped?: boolean | null): any;
/**
 * Attempts to derive the plural form of an English noun.
 * If '@plural' is passed as annotation, that is preferred.
 * @param {Annotations} dn annotations
 * @param {boolean} stripped if true, leading namespace will be stripped
 */
export function plural4(dn: Annotations, stripped: boolean): string | Annotations;
/**
 * Parses command line arguments into named and positional parameters.
 * Named parameters are expected to start with a double dash (--).
 * If the next argument `B` after a named parameter `A` is not a named parameter itself,
 * `B` is used as value for `A`.
 * If `A` and `B` are both named parameters, `A` is just treated as a flag (and may receive a default value).
 * Only named parameters that occur in validFlags are allowed. Specifying named flags that are not listed there
 * will cause an error.
 * Named parameters that are either not specified or do not have a value assigned to them may draw a default value
 * from their definition in validFlags.
 * @param {string[]} argv list of command line arguments
 * @param {Object<string, CommandlineFlag>} validFlags allowed flags. May specify default values.
 * @returns {ParsedFlags}
 */
export function parseCommandlineArgs(argv: string[], validFlags: {
    [x: string]: CommandlineFlag;
}): ParsedFlags;
/**
 * Performs a deep merge of the passed objects into the first object.
 * See Object.assign(target, source).
 * @param {Object} target object to assign into.
 * @param {Object} source object to assign from.
 */
export function deepMerge(target: any, source: any): void;
/**
* Entities inherit their ancestors annotations:
* https://cap.cloud.sap/docs/cds/cdl#annotation-propagation
* This is a problem if we annotate @singular/ @plural to an entity A,
* as we don't want all descendents B, C, ... to share the ancestor's
* annotated inflexion
* -> remove all such annotations that appear in a parent as well.
* BUT: we can't just delete the attributes. Imagine three classes
* A <- B <- C
* where A contains a @singular annotation.
* If we erase the annotation from B, C will still contain it and
* can not detect that its own annotation was inherited without
* travelling up the entire inheritance chain up to A.
* So instead, we monkey patch and maintain a dictionary "erased"
* when removing an annotation which we also check.
*/
export function fixCSN(csn: any): void;
