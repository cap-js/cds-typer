namespace external;

type Status: Integer enum {
    OK;
    ERROR
}

entity Issues {
    status: Status;
}