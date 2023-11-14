namespace array_test;

using elsewhere.ExternalType from './elsewhere';

type T {}

entity E {
    stringz :      array of String;
    numberz : many Integer;
    tz      :      array of T;
    extz    :      array of ExternalType;
    inlinez :      array of {
        a : String not null;
        b : Integer not null;
    } not null;
}

function fn(xs : array of Integer) returns array of String;
