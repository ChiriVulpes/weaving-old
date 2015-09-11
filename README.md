# weaving
A node module that exposes a sexy string-formatting api.

Works like the `string.format` in most languages. Here's a simple example:

	"Hello, {0}!".format("world"); // -> "Hello, world!"
	"Hello, {1}! My name is {0}.".format("Joe", "world"); // -> "Hello, world! My name is Joe."

<br>

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

<br>

##### Subkeys
You can also access subkeys of args. Here's an example:

	var example = "Hello, {name}! You've been playing for {timePlayed} hours.";
	example.format({name: "ExampleUser", timePlayed: 234.3}); // -> "Hello, ExampleUser! You've been playing for 234.3 hours."

This works for arrays as well:

	var example = "Hello, {name}! You've been playing for {game.1.timePlayed} hours.";
	example.format({name: "ExampleUser2", game: [{},{timePlayed: 234.3}]}); // -> "Hello, ExampleUser2! You've been playing for 234.3 hours."

As you've probably realised, it works the same for the argument list. By putting keys rather than integer indexes, it automatically assumes you mean 0.\<key\> To give you an example, `"{name}"` is interpreted as `"{0.name}"`

<br>

##### Looping
To simply loop over the arguments:

	"All arguments: {*}".format("blah", "pie", "cake"); // -> "All arguments: blahpiecake"

To add a separator, simply put the text you want to use for it after the asterisk.

	"All arguments: {*, }".format("blah", "pie", "cake"); // -> "All arguments: blah, pie, cake"

You don't have to print out the values you're looping through either, by the way. For example:

	var example = "{*, :Value {!}\\: {&}}";
	example.format("blah", "pie", "cake"); // -> "Value 1: blah, Value 2: pie, Value 3: cake"

As you can probably tell, `{!}` retrieves the current index, while `{&}` retrieves the current value.

You don't have to loop over the argument list, however. You can also loop over arrays/objects in your arguments.

	"List of {0}: {1*, }".format("users", ["Joe", "Bob", "Stevie"]); // -> "List of users: Joe, Bob, Stevie"

<br>

#### Utility functions

Weaving also offers a couple utility functions.

- `.weave(...args)`:
	- Weaves a string. Throws an error if the formatting is incorrect or an argument that does not exist is requested. See above.
- `.weaveIgnore(...args)`:
	- Weaves a string. Leaves substrings alone on errors.
- `.padLeft(length, with)`:
	- Pads the left side of a string so that it is at least the given length, with the provided substring.
- `.padRight(length, with)`:
	- Same thing, but instead pads to the right.
- `.capitalize()`:
	- Capitalises the first letter of a string.
- `.startsWith(substr)`:
	- Tests if a string starts with the provided substring. Utilises lastIndexOf in order to be more efficient.
- `.endsWith(substr)`:
	- Tests if a string ends with the provided substring. Utilises indexOf in order to be more efficient.
- `.proto(replace[, which])`:
	- Adds the functions to the String prototype. If `replace` is true, then it replaces any existing functions of the same name. `which` can be an object which represents the functions you'd like to add.
	- The keys in this object are the names of the functions in the weaving object, and they must be set to either a string or an array of strings, with which will be set on the String.prototype to the function. The `&` symbol is a shortcut to use the key.

Here's an example of the `which` object:

	var protos = {
	    weave: ["&", "format"],
	    weaveIgnore: ["&", "formatIgnoreErrors"],
	    padLeft: "&",
	    padRight: "&",
	    capitalize: ["&", "capitalise"],
	    startsWith: "&",
	    endsWith: "&",
	    tailsMatch: ["&", "startsAndEndsWith"]
	};

<br>

## Installation and use

You can get the package with `npm install weaving` or by adding it to your `package.json` and running `npm install`

To use it, simply do `require('weaving')`. It'll return an object with these functions. You can use them straight from that, or you can run `.proto` to apply them to the String prototype.


## Links

- [npm](https://www.npmjs.com/package/weaving)
- [github](https://github.com/aarilight/weaving)
