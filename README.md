# weaving
A node module that exposes a sexy string-formatting api.

Works like the `string.format` in most languages. Here's a simple example:

	"Hello, {0}!".format("world"); // -> "Hello, world!"
	"Hello, {1}! My name is {0}.".format("Joe", "world"); // -> "Hello, world! My name is Joe."

##### Conditionals
It gets more complicated (and fancy!):

	var example = "Hello, world!{0? My name is {0}.}";
	example.format("Joe"); // -> "Hello, world! My name is Joe."
	example.format(); // -> "Hello, world!"

	example = "Hello, {1}!{0? My name is {0}.";
	example.format("Joe", "world"); // -> "Hello, world! My name is Joe."
	example.format(null, "world"); // -> "Hello, world!"

But you can also use a different string if the conditional was not truthy.

	var example = "{0?My name is {0}:I have no name}.";
	example.format("Joe"); // -> "My name is Joe."
	example.format(null); // -> "I have no name."

##### Subkeys
You can also access subkeys of args. Here's an example:

	var example = "Hello, {name}! You've been playing for {timePlayed} hours.";
	example.format({name: "ExampleUser", timePlayed: 234.3}); // -> "Hello, ExampleUser! You've been playing for 234.3 hours."

This works for arrays as well:

	var example = "Hello, {name}! You've been playing for {game.1.timePlayed} hours.";
	example.format({name: "ExampleUser2", game: [{},{timePlayed: 234.3}]}); // -> "Hello, ExampleUser2! You've been playing for 234.3 hours."

As you've probably realised, it works the same for the argument list. By putting keys rather than integer indexes, it automatically assumes you mean 0.\<key\> To give you an example, `"{name}"` is interpreted as `"{0.name}"`

<br>
#### Coming soon!

##### Looping
To simply loop over the arguments:

	"All arguments: {*}".format("blah", "pie", "cake"); // -> "All arguments: blahpiecake"

To add a separator, simply put the text you want to use for it after the asterisk.

	"All arguments: {*, }".format("blah", "pie", "cake"); // -> "All arguments: blah, pie, cake"

You don't have to print out the values you're looping through either, by the way. For example:

	var example = "{*, :Value {!}\\: {&}}";
	example.format("blah", "pie", "cake"); // -> "Value 1: blah, Value 2: pie, Value 3: cake"

As you can probably tell, `{!}` retrieves the current index, while `{&}` retrieves the current value.

You don't have to loop over the argument list, however. You can also loop over arrays in your arguments.

	"List of {0}: {1*, }".format("users", ["Joe", "Bob", "Stevie"]); // -> "List of users: Joe, Bob, Stevie"

#### Utility functions

Weaving also offers a couple utility functions.

- `.padLeft(length, with)`:
	- Pads the left side of a string so that it is at least the given length, with the provided substring.
- `.padRight(length, with)`:
	- Same thing, but instead pads to the right.

## Installation and use

You can get the package with `npm install weaving` or by adding it to your `package.json` and running `npm install`

To use it, simply do `require('weaving')`. It'll return an object with these functions, along with `.proto()`
Calling `.proto()` will apply weaving to your String prototype, replacing any existing functions of the same name, but it allows you to call the methods like I did in this tutorial. =) <br>
Alternatively you can just call the functions in the object weaving returns.


## Links

- [npm](https://www.npmjs.com/package/weaving)
- [github](https://github.com/aarilight/weaving)