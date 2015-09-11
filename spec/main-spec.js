
require("../weaving.js").proto();

describe("weaving", function () {
    describe("a normal string", function () {
        it("should return what it is given", function () {
            var str = "Hello, world!";
            expect(str.weave()).toEqual(str);
        });
        it("should escape characters following a tilde", function () {
            var tests = {
                "~{~}": "{}",
                "~\\~~ ~~~ ~~~~ ~~~~~": "\\~ ~ ~~ ~~~",
                "~[~]": "[]"
            };
            for (var i in tests) {
                expect(i.weave()).toEqual(tests[i]);
            }
        });
    });
    describe("with basic argument splicing", function () {
        it("and one argument", function () {
            expect("Hello, {0}!".weave("world")).toEqual("Hello, world!");
        });
        it("and two arguments", function () {
            expect("Hello, {1}! My name is {0}.".weave("Joe", "world")).toEqual("Hello, world! My name is Joe.");
        });
    });
    describe("with a conditional", function () {
        var example = "Hello, world!{0? My name is {0}.}";
        it("should include the conditional if it's truthy", function () {
            expect(example.weave("Joe")).toEqual("Hello, world! My name is Joe.");
        });
        it("should not include the conditional if it's falsey", function () {
            expect(example.weave()).toEqual("Hello, world!");
        });
    });
    describe("with multiple arguments and a conditional", function () {
        var example = "Hello, {1}!{0? My name is {0}.}";
        it("should include the conditional if it's truthy", function () {
            expect(example.weave("Joe", "world")).toEqual("Hello, world! My name is Joe.");
        });
        it("should not include the conditional if it's falsey", function () {
            expect(example.weave(null, "world")).toEqual("Hello, world!");
        });
    });
    describe("with an else conditional", function () {
        var example = "{0?My name is {0}:I have no name}.";
        it("should include the conditional if it's truthy", function () {
            expect(example.weave("Joe")).toEqual("My name is Joe.");
        });
        it("should include the 'else' side of the conditional if it's falsey", function () {
            expect(example.weave()).toEqual("I have no name.");
        });
    });
    describe("with subkeys and object arguments", function () {
        it("should access subkeys of arguments", function () {
            var example = "Hello, {name}! You've been playing for {timePlayed} hours.";
            var tests = [
                {name: "ExampleUser", timePlayed: 234.3},
                {name: "BobSteveJimJoeGuy", timePlayed: 15}
            ];
            for (var i = 0; i < tests.length; i++) {
                expect(example.weave(tests[i]))
                .toEqual("Hello, " + tests[i].name + "! You've been playing for " + tests[i].timePlayed + " hours.");
            }
        });
        it("should be able to chain subkeys", function () {
            var example = "Hello, {name}! You've been playing for {game.1.timePlayed} hours.";
            var tests = [
                {name: "ExampleUser2", game: [
                    {timePlayed: 12},
                    {timePlayed: 234.3}
                ]},
                {name: "BobSteveJimJoeGuy", game: [
                    {timePlayed: 150},
                    {timePlayed: 15}
                ]}
            ];
            for (var i = 0; i < tests.length; i++) {
                expect(example.weave(tests[i]))
                .toEqual("Hello, " + tests[i].name + "! You've been playing for " + tests[i].game[1].timePlayed + " hours.");
            }
        });
    });
    describe("with looping through the argument list", function () {
        it("should put them together with your given separator", function () {
            var args = ["blah", "pie", "cake"];
            expect(String.prototype.weave.apply("All arguments: {*}", args)).toEqual("All arguments: " + args.join(""));
            expect(String.prototype.weave.apply("All arguments: {*, }", args)).toEqual("All arguments: " + args.join(", "));
        });
        it("should allow something custom for every entry in the array", function () {
            var example = "{*, :Value {!}~: '{&}'}";
            expect(example.weave("blah", "pie", "cake")).toEqual("Value 0: 'blah', Value 1: 'pie', Value 2: 'cake'");
        });
        it("should allow looping through subkeys rather than the actual argument list", function () {
            var tests = [
                {type: "users", list: ["Joe", "Bob", "Stevie"]},
                {type: "fruits", list: ["pineapple", "melon", "kiwi"]}
            ];
            for (var i = 0; i < tests.length; i++) {
                expect("List of {0}: {1*, }".weave(tests[i].type, tests[i].list)).toEqual("List of " + tests[i].type + ": " + tests[i].list.join(", "));
            }
        });
        it("should allow stacked loops", function () {
            var example = "Foods:{0*:\n  {!}~:\n    {&*, }}";
            var foods = {
                fruits: ["apples", "bananas", "pears"],
                candies: ["chocolate", "lollipops"],
                meats: ["pork", "beef", "chicken", "venison"]
            };
            var expected = "Foods:\n  fruits:\n    apples, bananas, pears\n  candies:\n    chocolate, lollipops\n  meats:\n    pork, beef, chicken, venison"
            expect(example.weave(foods)).toEqual(expected);
        });
    });
});