
require("./weaving.js").proto();

console.log("Hello, {0}!".format("world")); // -> "Hello, world!"
console.log("Hello, {1}! My name is {0}.".format("Joe", "world")); // -> "Hello, world! My name is Joe."

var example = "Hello, world!{0? My name is {0}.}";
console.log(example.format("Joe")); // -> "Hello, world! My name is Joe."
console.log(example.format()); // -> "Hello, world!"

example = "Hello, {1}!{0? My name is {0}.}";
console.log(example.format("Joe", "world")); // -> "Hello, world! My name is Joe."
console.log(example.format(null, "world")); // -> "Hello, world!"

var example = "{0?My name is {0}:I have no name}.";
console.log(example.format("Joe")); // -> "My name is Joe."
console.log(example.format(null)); // -> "I have no name."

var example = "Hello, {name}! You've been playing for {timePlayed} hours.";
console.log(example.format({name: "ExampleUser", timePlayed: 234.3})); // -> "Hello, ExampleUser! You've been playing for 234.3 hours."

var example = "Hello, {name}! You've been playing for {game.1.timePlayed} hours.";
console.log(example.format({name: "ExampleUser2", game: [{},{timePlayed: 234.3}]})); // -> "Hello, ExampleUser2! You've been playing for 234.3 hours."