/**
 * Wraps type into an array.
 * @param {string} t the singular type name.
 * @returns {string}
 */
export function createArrayOf(t: string): string;
/**
 * Wraps type into association to scalar.
 * @param {string} t the singular type name.
 * @returns {string}
 */
export function createToOneAssociation(t: string): string;
/**
 * Wraps type into association to vector.
 * @param {string} t the singular type name.
 * @returns {string}
 */
export function createToManyAssociation(t: string): string;
/**
 * Wraps type into composition of scalar.
 * @param {string} t the singular type name.
 * @returns {string}
 */
export function createCompositionOfOne(t: string): string;
/**
 * Wraps type into composition of vector.
 * @param {string} t the singular type name.
 * @returns {string}
 */
export function createCompositionOfMany(t: string): string;
/**
 * Wraps type into a deep require (removes all posibilities of undefined recursively).
 * @param {string} t the singular type name.
 * @param {string?} lookup a property lookup of the required type (`['Foo']`)
 * @returns {string}
 */
export function deepRequire(t: string, lookup?: string | null): string;
/**
 * Puts a passed string in docstring format.
 * @param {string} doc raw string to docify. May contain linebreaks.
 * @returns {string[]} an array of lines wrapped in doc format. The result is not
 *          concatenated to be properly indented by `buffer.add(...)`.
 */
export function docify(doc: string): string[];
