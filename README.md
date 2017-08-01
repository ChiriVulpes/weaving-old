# weaving
[![npm](https://img.shields.io/npm/v/weaving.svg?style=flat-square)](https://www.npmjs.com/package/weaving)
[![GitHub issues](https://img.shields.io/github/issues/Yuudaari/weaving.svg?style=flat-square)](https://github.com/Yuudaari/weaving)
[![Travis](https://img.shields.io/travis/Yuudaari/weaving.svg?style=flat-square)](https://travis-ci.org/Yuudaari/weaving)

A node module that exposes a sexy string-formatting api.

Works like the `string.format` in most languages. Here's a simple example:

```js
"Hello, {0}!".weave("world"); // -> "Hello, world!"
"Hello, {1}! My name is {0}.".weave("Joe", "world"); // -> "Hello, world! My name is Joe."
```

## Installation

```bat
npm install weaving
```

## More Documentation

### Basic Usage

```js
const { Weaver } = require("weaving"), weaver = new Weaver();

weaver.weave("Hi, {0}", "Joe"); // Hi, Joe

weaver.apply();

"Hi, {0}".weave("Susan"); // Hi, Susan
```

Whether or not you want to use the String.prototype function is up to you. The rest of the documentation uses the prototype version.

### Conditionals
It gets more complicated (and fancy!):

```js
var example = "Hello, world!{0? My name is {0}.}";
example.weave("Joe"); // -> "Hello, world! My name is Joe."
example.weave(); // -> "Hello, world!"

example = "Hello, {1}!{0? My name is {0}.";
example.weave("Joe", "world"); // -> "Hello, world! My name is Joe."
example.weave(null, "world"); // -> "Hello, world!"
```

But you can also use a different string if the conditional was not truthy.

```js
var example = "{0?My name is {0}:I have no name}.";
example.weave("Joe"); // -> "My name is Joe."
example.weave(null); // -> "I have no name."
```

### Subkeys
You can also access subkeys of args. Here's an example:

```js
var example = "Hello, {name}! You've been playing for {timePlayed} hours.";
example.weave({name: "ExampleUser", timePlayed: 234.3}); // -> "Hello, ExampleUser! You've been playing for 234.3 hours."
```

This works for arrays as well:

```js
var example = "Hello, {name}! You've been playing for {game.1.timePlayed} hours.";
example.weave({name: "ExampleUser2", game: [{},{timePlayed: 234.3}]}); // -> "Hello, ExampleUser2! You've been playing for 234.3 hours."
```

As you've probably realised, it works the same for the argument list. By putting keys rather than integer indexes, it automatically assumes you mean 0.\<key\> To give you an example, `"{name}"` is interpreted as `"{0.name}"`

### Looping
To simply loop over the arguments:

```js
"All arguments: {*}".weave("blah", "pie", "cake"); // -> "All arguments: blahpiecake"
```

To add a separator, simply put the text you want to use for it after the asterisk.

```js
"All arguments: {*, }".weave("blah", "pie", "cake"); // -> "All arguments: blah, pie, cake"
```

You don't have to print out the values you're looping through either, by the way. For example:

```js
var example = "{*, :Value {!}~: {&}}";
example.weave("blah", "pie", "cake"); // -> "Value 1: blah, Value 2: pie, Value 3: cake"
```

As you can probably tell, `{!}` retrieves the current index, while `{&}` retrieves the current value.

You don't have to loop over the argument list, however. You can also loop over arrays/objects in your arguments.

```js
"List of {0}: {1*, }".weave("users", ["Joe", "Bob", "Stevie"]); // -> "List of users: Joe, Bob, Stevie"
```

### Length

But what if you just want to get or check the length of an object? You can do that too, with the `..` operator!

```js
var example = "the list {0..?has items!:is empty...}";

example.weave([]); // -> "the list is empty..."
example.weave([1, 2, 3]); // -> "the list has items!"

example.weave({}); // -> "the list is empty..."
example.weave({item1: 1, item2: 2}); // -> "the list has items!"
```

By not providing any keys, you are working on the provided arguments.

```js
var example = "there are{..?: no} arguments";

example.weave(); // -> "there are no arguments"
example.weave(1, 2, 3); // -> "there are arguments"
```

This also works for simply including the list length.

```js
var example = "there are {..} arguments";

example.weave(1, 2, 3); // -> "there are 3 arguments"
```

### Tabbificiation

For exporting code-based structures having the ability to tabbify content is important. Weaving supports this with the `>` segment.
Here's an example:

```js
var example = "<div>\\n{>wow this text is indented!!!\\nSo is this!}</div>"

example.weave();
// <div>
//     wow this text is indented!!!
//     So is this!
// </div>
```

### Libraries

Weaving is built on a strong engine. Internally, the text between every curly brace in a weaving string is called a "Strand", and the support for all of the strands you've just seen are provided using Weaving's API. 

That's right, Weaving, out of the box, supports extensions as extreme as everything it can do by default. Regretfully, it is complex to write a Weaving extension, and currently there is no documentation on it, but a section on it in this documentation is on my todo list.

## MIT License

[Copyright 2017 Mackenzie McClane](./LICENSE)