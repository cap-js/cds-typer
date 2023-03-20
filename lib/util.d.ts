interface Annotations {
    name?: string,
    '@singular'?: string,
    '@plural'?: string
}

interface CommandlineFlag {
    desc: string,
    default?: any
}

interface ParsedFlags {
    positional: string[],
    named: {[key: string]: any}
}

/**
 * Tries to retrieve an annotation that specifies the singular name
 * from a CSN. Valid annotations are listed in util.annotations
 * and their precedence is in order of definition.
 * If no singular is specified at all, undefined is returned.
 * @param csn the CSN of an entity to check
 * @returns the singular annotation or undefined
 */
export function getSingularAnnotation(csn: {}): string | undefined;

/**
 * Tries to retrieve an annotation that specifies the plural name
 * from a CSN. Valid annotations are listed in util.annotations
 * and their precedence is in order of definition.
 * If no plural is specified at all, undefined is returned.
 * @param csn the CSN of an entity to check
 * @returns the plural annotation or undefined
 */
 export function getPluralAnnotation(csn: {}): string | undefined;


 /**
  * Users can specify that they want to refer to localisation
  * using the syntax {i18n>Foo}, where Foo is the name of the
  * entity as found in the .cds file
  * (see: https://pages.github.tools.sap/cap/docs/guides/i18n)
  * As this throws off the naming, we remove this wrapper
  * unlocalize("{i18n>Foo}") -> "Foo"
  * @param name the entity name (singular or plural).
  * @returns the name without localisation syntax or untouched.
  */
 export function unlocalize(name: string): string;

/**
 * Attempts to derive the singular form of an English noun.
 * If '@singular' is passed as annotation, that is preferred.
 * @param dn annotations
 * @param stripped if true, leading namespace will be stripped
 */
export function singular4(dn: Annotations | string, stripped: boolean): string;

/**
 * Attempts to derive the plural form of an English noun.
 * If '@plural' is passed as annotation, that is preferred. 
 * @param dn annotations
 * @param stripped if true, leading namespace will be stripped
 */
export function plural4(dn: Annotations | string, stripped: boolean): string;

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
 * @param argv list of command line arguments
 * @param validFlags allowed flags. May specify default values.
 */
export function parseCommandlineArgs(argv: string[], validFlags: {[key: string]: CommandlineFlag}): ParsedFlags;

/**
 * Performs a deep merge of the passed objects into the first object. 
 * See Object.assign(target, source).
 * @param target object to assign into.
 * @param source object to assign from.
 */
export function deepMerge(target: {}, source: {}): void;