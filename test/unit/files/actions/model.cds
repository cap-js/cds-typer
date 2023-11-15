namespace actions_test;

using elsewhere.ExternalType from './elsewhere';
using elsewhere.ExternalType2 from './elsewhere';
using ExternalInRoot from './root';

service S {
    entity E {} actions {
        action   f(x : String not null);
        function g(a : {
            x : Integer not null;
            y : Integer not null
        } not null,
                   b : Integer not null) returns Integer not null;
        action   h()                     returns {
            a : Integer not null;
            b : String not null
        } not null;
        action   k()                     returns ExternalType not null;
        action   l()                     returns ExternalInRoot not null;
        action   s1(in : $self not null);
        action   sn(in : many $self);
        action   sx(in : $self not null, x : Int16 not null);
    }
}

action free(param : String not null) returns {
    a : Integer not null;
    b : String not null;
} not null;

action free2()                       returns ExternalType not null;
action free3()                       returns ExternalInRoot not null;

action free4()                       returns {
    foo : ExternalType2 not null
} not null;
