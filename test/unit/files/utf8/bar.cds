using { ![A/B] as ab, ![T Y P E] as T } from './foo';

entity ![C DÄ#] {
    key ID: Integer;
    ![välue]: String;
    x: Association to ab;
    y: T;
    z: String enum {
        אֶחָד; اثنين; 三  // 1,2,3 in Hebrew, Arabic, Chinese
    };
} actions {
    action ![bound action]() returns String;
} 
action ![unbound action]() returns String;

entity A {
    x: String;
}

entity 本 {  // Book
    作家: String;  // Author
    タイトル: ![C DÄ#]:![välue];  // Title
}

entity object {  // reserved word
    key ID: Integer;
    object: String;
    for: String;
    function: String;
}
