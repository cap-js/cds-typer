namespace external;

type Status: Integer enum {
    OK = 0;
    ERROR = 1;
}

entity Issues {
    status: Status;
}