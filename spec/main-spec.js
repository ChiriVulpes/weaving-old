


let weaving = require("../../weaving");

weaving.weave.applyTo("weave", String);

// TODO tests for applyProtos

describe("weaving", () => {

    describe("a normal string", () => {

        it("should return what it is given", () => {
            let str = "Hello, world!";
            expect(str.weave()).toEqual(str);
        });

        it("should escape characters following a tilde", () => {
            let tests = {
                "~{~}": "{}",
                "~\\~~ ~~~ ~~~~ ~~~~~": "\\~ ~ ~~ ~~~",
                "~[~]": "[]"
            };
            for (let i in tests) {
                expect(i.weave()).toEqual(tests[i]);
            }
        });

    });


    describe("with basic argument splicing", () => {

        it("should splice one argument", () => {
            expect("Hello, {0}!".weave("world")).toEqual("Hello, world!");
        });

        it("should splice multiple arguments", () => {
            expect("Hello, {1}! My name is {0}.".weave("Joe", "world")).toEqual("Hello, world! My name is Joe.");
        });

    });


    describe("with a conditional", () => {

        let example = "Hello, world!{0? My name is {0}.}";

        it("should include the conditional if it's truthy", () => {
            expect(example.weave("Joe")).toEqual("Hello, world! My name is Joe.");
        });

        it("should not include the conditional if it's falsey", () => {
            expect(example.weave()).toEqual("Hello, world!");
        });

        it("should allow escaping a colon", () => {
            let colon = "{0?~: <- a colon}";
            expect(colon.weave(true)).toEqual(": <- a colon");
            expect(colon.weave()).toEqual("");
        });


        describe("(inverse)", () => {

            let example2 = "Hello, world!{0!? No name provided.}";

            it("should not include the conditional if it's truthy", () => {
                expect(example2.weave("Joe")).toEqual("Hello, world!");
            });

            it("should include the conditional if it's falsey", () => {
                expect(example2.weave()).toEqual("Hello, world! No name provided.");
            });

            it("should allow escaping a colon in the conditional", () => {
                let colon = "{0?~: <- a colon}";
                expect(colon.weave(true)).toEqual(": <- a colon");
                expect(colon.weave()).toEqual("");
            });

        });


        describe("that has an 'else' clause", () => {

            let example = "{0?My name is {0}:I have no name}.";

            it("should include the conditional if it's truthy", () => {
                expect(example.weave("Joe")).toEqual("My name is Joe.");
            });

            it("should include the 'else' side of the conditional if it's falsey", () => {
                expect(example.weave()).toEqual("I have no name.");
            });

            it("should allow escaping the colon", () => {
                let test1 = "{0?~: <- a colon:no colon!}";
                expect(test1.weave(true)).toEqual(": <- a colon");
                expect(test1.weave()).toEqual("no colon!");
                let test2 = "{0?no colon!:~: <- a colon}";
                expect(test2.weave(true)).toEqual("no colon!");
                expect(test2.weave()).toEqual(": <- a colon");
            });


            describe("(and is inverse)", () => {

                let example2 = "{0?My name is {0}:I have no name}.";

                it("should include the conditional if it's truthy", () => {
                    expect(example2.weave("Joe")).toEqual("My name is Joe.");
                });

                it("should include the 'else' side of the conditional if it's falsey", () => {
                    expect(example2.weave()).toEqual("I have no name.");
                });

                it("should allow escaping the colon", () => {
                    let test1 = "{0!?~: <- a colon:no colon!}";
                    expect(test1.weave(true)).toEqual("no colon!");
                    expect(test1.weave()).toEqual(": <- a colon");
                    let test2 = "{0!?no colon!:~: <- a colon}";
                    expect(test2.weave(true)).toEqual(": <- a colon");
                    expect(test2.weave()).toEqual("no colon!");
                });

            });

        });

        
        describe("that compares", () => {

            
            it("equality", () => {
                let example = "{0=='Joe'?I knew your name was Joe!:Wait, is your name really {0}?}";
                expect(example.weave("Joe")).toEqual("I knew your name was Joe!");
                expect(example.weave("Susan")).toEqual("Wait, is your name really Susan?");
            });

            it("inequality", () => {
                let example = "{0!='Joe'?{0}?! I swore your name was Joe...:You scared me, Joe.}";
                expect(example.weave("Joe")).toEqual("You scared me, Joe.");
                expect(example.weave("Susan")).toEqual("Susan?! I swore your name was Joe...");
            });

            it("greater than", () => {
                let example = "{~1>~0?true:false}";
                expect(example.weave(1)).toEqual("true");
            });

            it("less than", () => {
                expect("{~0.5<~0.51?true:false}".weave()).toEqual("true");
                expect("{~0.51<~0.5?true:false}".weave()).toEqual("false");
            });

            it("greater than or equal to", () => {
                let example = "{0>=1?true:false}";
                expect(example.weave(0, 1)).toEqual("false");
                expect(example.weave(1, 0)).toEqual("true");
            });

            it("less than or equal to", () => {
                let example = "{0<=1?true:false}";
                expect(example.weave(0, 1)).toEqual("true");
                expect(example.weave(1, 0)).toEqual("false");
            });

            it("contains", () => {
                let example = "{0<<1?true:false}";
                expect(example.weave(0, [0])).toEqual("true");
                expect(example.weave(0, [1, 0, 10])).toEqual("true");
                expect(example.weave(0, [])).toEqual("false");
                expect(example.weave(0, [1, 10])).toEqual("false");
                expect(example.weave(0, "test0test")).toEqual("true");
                expect(example.weave(0, "test")).toEqual("false");
                expect(example.weave(0, "")).toEqual("false");
            });

        });


        describe("and multiple arguments", () => {

            let example = "Hello, {1}!{0? My name is {0}.}";

            it("should include the conditional if it's truthy", () => {
                expect(example.weave("Joe", "world")).toEqual("Hello, world! My name is Joe.");
            });

            it("should not include the conditional if it's falsey", () => {
                expect(example.weave(null, "world")).toEqual("Hello, world!");
            });

        });

    });


    describe("with subkeys and object arguments", () => {

        it("should access subkeys of arguments", () => {
            let example = "Hello, {name}! You've been playing for {timePlayed} hours.";
            let tests = [
                {name: "ExampleUser", timePlayed: 234.3},
                {name: "BobSteveJimJoeGuy", timePlayed: 15}
            ];
            for (let i = 0; i < tests.length; i++) {
                expect(example.weave(tests[i]))
                .toEqual("Hello, " + tests[i].name + "! You've been playing for " + tests[i].timePlayed + " hours.");
            }
        });

        it("should be able to chain subkeys", () => {
            let example = "Hello, {name}! You've been playing for {game.1.timePlayed} hours.";
            let tests = [
                {name: "ExampleUser2", game: [
                    {timePlayed: 12},
                    {timePlayed: 234.3}
                ]},
                {name: "BobSteveJimJoeGuy", game: [
                    {timePlayed: 150},
                    {timePlayed: 15}
                ]}
            ];
            for (let i = 0; i < tests.length; i++) {
                expect(example.weave(tests[i]))
                .toEqual("Hello, " + tests[i].name + "! You've been playing for " + tests[i].game[1].timePlayed + " hours.");
            }
        });

    });


    describe("with looping through the argument list", () => {

        it("should put them together with your given separator", () => {
            let args = ["blah", "pie", "cake"];
            expect(String.prototype.weave.apply("All arguments: {*}", args)).toEqual("All arguments: " + args.join(""));
            expect(String.prototype.weave.apply("All arguments: {*, }", args)).toEqual("All arguments: " + args.join(", "));
        });

        it("should allow something custom for every entry in the array", () => {
            let example = "{*, :Value {!}~: '{&}'}";
            expect(example.weave("blah", "pie", "cake")).toEqual("Value 0: 'blah', Value 1: 'pie', Value 2: 'cake'");
        });

        it("should allow looping through subkeys rather than the actual argument list", () => {
            let tests = [
                {type: "users", list: ["Joe", "Bob", "Stevie"]},
                {type: "fruits", list: ["pineapple", "melon", "kiwi"]}
            ];
            for (let i = 0; i < tests.length; i++) {
                expect("List of {0}: {1*, }".weave(tests[i].type, tests[i].list)).toEqual("List of " + tests[i].type + ": " + tests[i].list.join(", "));
            }
        });

        it("should allow stacked loops", () => {
            let example = "Foods:{0*:\n  {!}~:\n    {&*, }}";
            let foods = {
                fruits: ["apples", "bananas", "pears"],
                candies: ["chocolate", "lollipops"],
                meats: ["pork", "beef", "chicken", "venison"]
            };
            let expected = "Foods:\n  fruits:\n    apples, bananas, pears\n  candies:\n    chocolate, lollipops\n  meats:\n    pork, beef, chicken, venison"
            expect(example.weave(foods)).toEqual(expected);
        });

    });


    describe("with length checks", () => {

        let example = "{0..?the list isn't empty!:the list is empty...}";

        it("should work for arrays", () => {
            expect(example.weave([])).toEqual("the list is empty...");
            expect(example.weave([""])).toEqual("the list isn't empty!");
        });

        it("should also work for objects", () => {
            expect(example.weave({})).toEqual("the list is empty...");
            expect(example.weave({item1: ""})).toEqual("the list isn't empty!");
        });

        it("should also work for the arguments list", () => {
            let example = "{..?there are arguments!:there are no arguments...}";
            expect(example.weave()).toEqual("there are no arguments...");
            expect(example.weave("")).toEqual("there are arguments!");
        });

        it("should also work for a string", () => {
            let example = "{0..?there's a string!:the string is empty...}";
            expect(example.weave("")).toEqual("the string is empty...");
            expect(example.weave("hello, world!")).toEqual("there's a string!");
        });
        
        describe("should allow using the length in the resulting string and", () => {

            let example2 = "{0..}";

            it("should work for arrays", () => {
                expect(example2.weave([])).toEqual("0");
                expect(example2.weave([1, 2, 3])).toEqual("3");
            });

            it("should also work for objects", () => {
                expect(example2.weave({})).toEqual("0");
                expect(example2.weave({item1: 1, item2: 2, item3: 3})).toEqual("3");
            });

            it("should also work for the arguments list", () => {
                let example = "{..}";
                expect(example.weave()).toEqual("0");
                expect(example.weave(1, 2, 3)).toEqual("3");
            });

            it("should also work for a string", () => {
                let example = "{0..}";
                expect(example.weave("")).toEqual("0");
                expect(example.weave("hello")).toEqual("5");
            });

        });

    });


    describe ("with tabbification strands", () => it("should tabbify successfully", () => {
        let escape = function (str) {
            return str.replace(/\r/g, "\\r").replace(/\n/g, "\\n").replace(/\t/g, "\\t");
        };
        let example = "{>test\ntest}";
        expect(escape(example.weave())).toEqual(escape("\ttest\n\ttest"));

        example = "test\n{>test\ntest}\ntest";
        expect(escape(example.weave())).toEqual(escape("test\n\ttest\n\ttest\ntest"));

        example = "test\n{>>test\ntest}\ntest";
        expect(escape(example.weave())).toEqual(escape("test\n\t\ttest\n\t\ttest\ntest"));

        example = "{>test\n{>test\ntest}\ntest}";
        expect(escape(example.weave())).toEqual(escape("\ttest\n\t\ttest\n\t\ttest\n\ttest"));

        example = "test\n{>test\ntest\n{>>test\ntest\ntest}\ntest}\ntest";
        expect(escape(example.weave())).toEqual(escape("test\n\ttest\n\ttest\n\t\t\ttest\n\t\t\ttest\n\t\t\ttest\n\ttest\ntest"));

    }));

});