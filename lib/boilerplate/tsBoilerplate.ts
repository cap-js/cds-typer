import cds from '@sap/cds'
import { type, entity } from '@sap/cds'

export type ElementsOf<T> = {[name in keyof Required<T>]: type }

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

export type DraftEntity<T> = T & {
    IsActiveEntity?: boolean | null
    HasActiveEntity?: boolean | null
    HasDraftEntity?: boolean | null
    DraftAdministrativeData_DraftUUID?: string | null
}

export type DraftOf<T> = { new(...args: any[]): DraftEntity<T> }
export type DraftsOf<T> = typeof Array<DraftEntity<T>>

export type DeepRequired<T> = { 
    [K in keyof T]: DeepRequired<Unkey<T[K]>>
} & Exclude<Required<T>, null>;

const key = Symbol('key')  // to avoid .key showing up in IDE's auto-completion
export type Key<T> = T & {[key]?: true}

export type KeysOf<T> = {
  [K in keyof T as NonNullable<T[K]> extends Key<unknown> ? K : never]-?: Key<{}>  // T[K] 
}

export type Unkey<T> = T extends Key<infer U> ? U : T

/**
 * Dates and timestamps are strings during runtime, so cds-typer represents them as such.
 */
export type CdsDate = `${number}${number}${number}${number}-${number}${number}-${number}${number}`;
/**
 * @see {@link CdsDate}
 */
export type CdsDateTime = string;
/**
 * @see {@link CdsDate}
 */
export type CdsTime = `${number}${number}:${number}${number}:${number}${number}`;
/**
 * @see {@link CdsDate}
 */
export type CdsTimestamp = string;

export type CdsMap = { [key: string]: unknown };


export const createEntityProxy = function (fqParts: any, opts = {}) {
    const { target, customProps } = { target: {}, customProps: [] as any[], ...opts }
    const fq = fqParts.filter((p: any) => !!p).join('.')
    return new Proxy(target, {
        get: function (target:any, prop:any) {
            if (cds.entities) {
                const ns = cds.entities(fqParts[0])
                let entity: entity | undefined = ns[fqParts[1]]
                if (!entity && fqParts[1]?.endsWith('.texts')) {
                    // compat_texts_entities=false (CAP v10 default): texts entities are not
                    // registered as top-level entries, access them via the parent entity instead
                    entity = ns[fqParts[1].slice(0, -'.texts'.length)]?.texts
                }
                target.__proto__ = entity
                // overwrite/simplify getter after cds.entities is accessible
                this.get = (target, prop) => target[prop]
                return target[prop]
            }
            // we already know the name so we skip the cds.entities proxy access
            if (prop === 'name') return fq
            // custom properties access on 'target' as well as cached _entity property access goes here
            if (Object.hasOwn(target, prop)) return target[prop]
            // inline enums have to be caught here for first time access, as they do not exist on the entity
            if (customProps.includes(prop as never)) return target[prop]
            // last but not least we pass the property access to cds.entities
            throw new Error(`Property ${prop} does not exist on entity '${fq}' or cds.entities is not yet defined. Ensure the CDS runtime is fully booted before accessing properties.`)
        }
    })
}