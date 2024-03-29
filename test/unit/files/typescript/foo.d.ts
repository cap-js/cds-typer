import * as imp from '../../../../a/b/c/';


declare const ManyStrings: string[];

export class Foo {
}

export function FooWithProperties() {
  return class FooWithProperties {
    foo: Foo;
    aNumber: number;
    manyNumbers: number[];
    text: string;
    texts: ManyStrings;
    gizmo: imp.Bar;
    union: number | string;
    intersection: number & string;
    interunion: number & string | number[];
}
}

export function FooWithNestedTypes() {
    return class FooWithNestedTypes {
        foo: {
            bar: {
                baz: string
            },
            qux: number
        }
    }
}

export class SomeSingularClass {}