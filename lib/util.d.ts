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