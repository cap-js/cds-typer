namespace inline;

// named struct type used as element type (issue #347, user report)
type Author : {
    firstName : String;
    lastName  : String;
}

type ContentVersionType : {
    Development : String;
    Production  : String;
}

aspect ContentAspect {
    ContentVersion : ContentVersionType;
}

entity Books {
    key ID    : UUID;
    title     : String;
    author    : Author;
}

entity ContentItem {
    key ID             : UUID;
    ContentVersion     : ContentVersionType;
}

entity ContentItemWithAspect : ContentAspect {
    key ID : UUID;
}
