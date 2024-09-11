const { SourceFile } = require('../file')

// eslint-disable-next-line no-template-curly-in-string
const dateRegex = '`${number}${number}${number}${number}-${number}${number}-${number}${number}`'
// eslint-disable-next-line no-template-curly-in-string
const timeRegex = '`${number}${number}:${number}${number}:${number}${number}`'

/**
 * Base definitions used throughout the typing process,
 * such as Associations and Compositions.
 * @type {SourceFile}
 */
const baseDefinitions = new SourceFile('_')
// FIXME: this should be a library someday
baseDefinitions.addPreamble(`
export namespace Association {
    export type to <T> = T;
    export namespace to {
        export type many <T extends readonly any[]> = T;
    }
}

export namespace Composition {
    export type of <T> = T;
    export namespace of {
        export type many <T extends readonly any[]> = T;
    }
}

export class Entity {
    static data<T extends Entity> (this:T, _input:Object) : T {
        return {} as T // mock
    }
}

export type EntitySet<T> = T[] & {
    data (input:object[]) : T[]
    data (input:object) : T
};

export type DeepRequired<T> = { 
    [K in keyof T]: DeepRequired<T[K]>
} & Exclude<Required<T>, null>;

const key = Symbol('key')  // to avoid .key showing up in IDE's auto-completion
export type Key<T> = T & {[key]?: true}

export type KeysOf<T> = {
  [K in keyof T as NonNullable<T[K]> extends Key<unknown> ? K : never]-?: Key<{}>  // T[K] 
}

/**
 * Dates and timestamps are strings during runtime, so cds-typer represents them as such.
 */
export type CdsDate = ${dateRegex};
/**
 * @see {@link CdsDate}
 */
export type CdsDateTime = string;
/**
 * @see {@link CdsDate}
 */
export type CdsTime = ${timeRegex};
/**
 * @see {@link CdsDate}
 */
export type CdsTimestamp = string;
`)

module.exports = { baseDefinitions }