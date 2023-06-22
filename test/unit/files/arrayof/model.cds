namespace array_test;
using elsewhere.ExternalType from './elsewhere';

type T {}

function f1 () returns array of String;
function f2 () returns array of T;
function f3 () returns array of ExternalType;
function f4 () returns array of { a: String; b: Integer; };