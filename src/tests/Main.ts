/// <reference types="mocha" />

import { expect } from "chai";

import { Weaver } from "../weaving";
const weaver = new Weaver();
weaver.apply();

import { Library, Chain } from "weaving-api";

describe("weaving", () => {

	describe("a normal string", () => {

		it("should return what it is given", () => {
			const str = "Hello, world!";
			expect(str.weave()).eq(str);
		});

		it("should escape characters following a tilde", () => {
			const tests = {
				"~{~}": "{}",
				"~\\~~ ~~~ ~~~~ ~~~~~": "\\~ ~ ~~ ~~~",
				"~[~]": "[]",
			};
			for (const i in tests) {
				expect(i.weave()).eq(tests[i as keyof typeof tests]);
			}
		});

	});


	describe("with basic argument splicing", () => {

		it("should splice one argument", () => {
			expect("Hello, {0}!".weave("world")).eq("Hello, world!");
		});

		it("should splice multiple arguments", () => {
			expect("Hello, {1}! My name is {0}.".weave("Joe", "world")).eq("Hello, world! My name is Joe.");
		});

	});


	describe("with a conditional", () => {

		const example = "Hello, world!{0? My name is {0}.}";

		it("should include the conditional if it's truthy", () => {
			expect(example.weave("Joe")).eq("Hello, world! My name is Joe.");
		});

		it("should not include the conditional if it's falsey", () => {
			expect(example.weave()).eq("Hello, world!");
		});

		it("should allow escaping a colon", () => {
			const colon = "{0?~: <- a colon}";
			expect(colon.weave(true)).eq(": <- a colon");
			expect(colon.weave()).eq("");
		});


		describe("(inverse)", () => {

			const example2 = "Hello, world!{0!? No name provided.}";

			it("should not include the conditional if it's truthy", () => {
				expect(example2.weave("Joe")).eq("Hello, world!");
			});

			it("should include the conditional if it's falsey", () => {
				expect(example2.weave()).eq("Hello, world! No name provided.");
			});

			it("should allow escaping a colon in the conditional", () => {
				const colon = "{0?~: <- a colon}";
				expect(colon.weave(true)).eq(": <- a colon");
				expect(colon.weave()).eq("");
			});

		});


		describe("that has an 'else' clause", () => {

			const example2 = "{0?My name is {0}:I have no name}.";

			it("should include the conditional if it's truthy", () => {
				expect(example2.weave("Joe")).eq("My name is Joe.");
			});

			it("should include the 'else' side of the conditional if it's falsey", () => {
				expect(example2.weave()).eq("I have no name.");
			});

			it("should allow escaping the colon", () => {
				const test1 = "{0?~: <- a colon:no colon!}";
				expect(test1.weave(true)).eq(": <- a colon");
				expect(test1.weave()).eq("no colon!");
				const test2 = "{0?no colon!:~: <- a colon}";
				expect(test2.weave(true)).eq("no colon!");
				expect(test2.weave()).eq(": <- a colon");
			});


			describe("(and is inverse)", () => {

				const example3 = "{0?My name is {0}:I have no name}.";

				it("should include the conditional if it's truthy", () => {
					expect(example3.weave("Joe")).eq("My name is Joe.");
				});

				it("should include the 'else' side of the conditional if it's falsey", () => {
					expect(example3.weave()).eq("I have no name.");
				});

				it("should allow escaping the colon", () => {
					const test1 = "{0!?~: <- a colon:no colon!}";
					expect(test1.weave(true)).eq("no colon!");
					expect(test1.weave()).eq(": <- a colon");
					const test2 = "{0!?no colon!:~: <- a colon}";
					expect(test2.weave(true)).eq(": <- a colon");
					expect(test2.weave()).eq("no colon!");
				});

			});

		});

		it("should not catch inner else clauses", () => {
			const example2 = "{0?First is true.{1?: Second is false.}}";
			expect(example2.weave(true, true)).eq("First is true.");
			expect(example2.weave(true, false)).eq("First is true. Second is false.");
			expect(example2.weave(false, true)).eq("");
			expect(example2.weave(false, false)).eq("");
		});


		describe("that compares", () => {

			it("equality", () => {
				const example2 = "{0=='Joe'?I knew your name was Joe!:Wait, is your name really {0}?}";
				expect(example2.weave("Joe")).eq("I knew your name was Joe!");
				expect(example2.weave("Susan")).eq("Wait, is your name really Susan?");
			});

			it("inequality", () => {
				const example2 = "{0!='Joe'?{0}?! I swore your name was Joe...:You scared me, Joe.}";
				expect(example2.weave("Joe")).eq("You scared me, Joe.");
				expect(example2.weave("Susan")).eq("Susan?! I swore your name was Joe...");
			});

			it("greater than", () => {
				const example2 = "{~1>~0?true:false}";
				expect(example2.weave(1)).eq("true");
			});

			it("less than", () => {
				expect("{~0.5<~0.51?true:false}".weave()).eq("true");
				expect("{~0.51<~0.5?true:false}".weave()).eq("false");
			});

			it("greater than or equal to", () => {
				const example2 = "{0>=1?true:false}";
				expect(example2.weave(0, 1)).eq("false");
				expect(example2.weave(1, 0)).eq("true");
			});

			it("less than or equal to", () => {
				const example2 = "{0<=1?true:false}";
				expect(example2.weave(0, 1)).eq("true");
				expect(example2.weave(1, 0)).eq("false");
			});

			it("contains", () => {
				const example2 = "{0<<1?true:false}";
				expect(example2.weave(0, [0])).eq("true");
				expect(example2.weave(0, [1, 0, 10])).eq("true");
				expect(example2.weave(0, [])).eq("false");
				expect(example2.weave(0, [1, 10])).eq("false");
				expect(example2.weave(0, "test0test")).eq("true");
				expect(example2.weave(0, "test")).eq("false");
				expect(example2.weave(0, "")).eq("false");
			});

		});


		describe("and multiple arguments", () => {

			const example2 = "Hello, {1}!{0? My name is {0}.}";

			it("should include the conditional if it's truthy", () => {
				expect(example2.weave("Joe", "world")).eq("Hello, world! My name is Joe.");
			});

			it("should not include the conditional if it's falsey", () => {
				expect(example2.weave(null, "world")).eq("Hello, world!");
			});

		});

	});


	describe("with subkeys and object arguments", () => {

		it("should access subkeys of arguments", () => {
			const example = "Hello, {name}! You've been playing for {timePlayed} hours.";
			const tests = [
				{ name: "ExampleUser", timePlayed: 234.3 },
				{ name: "BobSteveJimJoeGuy", timePlayed: 15 },
			];
			for (const test of tests) {
				expect(example.weave(test))
					.eq("Hello, " + test.name + "! You've been playing for " + test.timePlayed + " hours.");
			}
		});

		it("should be able to chain subkeys", () => {
			const example = "Hello, {name}! You've been playing for {game.1.timePlayed} hours.";
			const tests = [
				{
					name: "ExampleUser2", game: [
						{ timePlayed: 12 },
						{ timePlayed: 234.3 },
					],
				},
				{
					name: "BobSteveJimJoeGuy", game: [
						{ timePlayed: 150 },
						{ timePlayed: 15 },
					],
				},
			];
			for (const test of tests) {
				expect(example.weave(test))
					.eq("Hello, " + test.name + "! You've been playing for " + test.game[1].timePlayed + " hours.");
			}
		});

	});


	describe("with looping through the argument list", () => {

		it("should put them together with your given separator", () => {
			const args = ["blah", "pie", "cake"];
			expect(String.prototype.weave.apply("All arguments: {*}", args)).eq("All arguments: " + args.join(""));
			expect(String.prototype.weave.apply("All arguments: {*, }", args)).eq("All arguments: " + args.join(", "));
		});

		it("should allow something custom for every entry in the array", () => {
			const example = "{*, :Value {!}~: '{&}'}";
			expect(example.weave("blah", "pie", "cake")).eq("Value 0: 'blah', Value 1: 'pie', Value 2: 'cake'");
		});

		it("should allow looping through subkeys rather than the actual argument list", () => {
			const tests = [
				{ type: "users", list: ["Joe", "Bob", "Stevie"] },
				{ type: "fruits", list: ["pineapple", "melon", "kiwi"] },
			];
			for (const test of tests) {
				expect("List of {0}: {1*, }".weave(test.type, test.list)).eq("List of " + test.type + ": " + test.list.join(", "));
			}
		});

		it("should allow stacked loops", () => {
			const example = "Foods:{0*:\n  {!}~:\n    {&*, }}";
			const foods = {
				fruits: ["apples", "bananas", "pears"],
				candies: ["chocolate", "lollipops"],
				meats: ["pork", "beef", "chicken", "venison"],
			};
			const expected = "Foods:\n  fruits:\n    apples, bananas, pears\n  candies:\n    chocolate, lollipops\n  meats:\n    pork, beef, chicken, venison";
			expect(example.weave(foods)).eq(expected);
		});

	});


	describe("with length checks", () => {

		const example = "{0..?the list isn't empty!:the list is empty...}";

		it("should work for arrays", () => {
			expect(example.weave([])).eq("the list is empty...");
			expect(example.weave([""])).eq("the list isn't empty!");
		});

		it("should also work for objects", () => {
			expect(example.weave({})).eq("the list is empty...");
			expect(example.weave({ item1: "" })).eq("the list isn't empty!");
		});

		it("should also work for the arguments list", () => {
			const example2 = "{..?there are arguments!:there are no arguments...}";
			expect(example2.weave()).eq("there are no arguments...");
			expect(example2.weave("")).eq("there are arguments!");
		});

		it("should also work for a string", () => {
			const example2 = "{0..?there's a string!:the string is empty...}";
			expect(example2.weave("")).eq("the string is empty...");
			expect(example2.weave("hello, world!")).eq("there's a string!");
		});

		describe("should allow using the length in the resulting string and", () => {

			const example2 = "{0..}";

			it("should work for arrays", () => {
				expect(example2.weave([])).eq("0");
				expect(example2.weave([1, 2, 3])).eq("3");
			});

			it("should also work for objects", () => {
				expect(example2.weave({})).eq("0");
				expect(example2.weave({ item1: 1, item2: 2, item3: 3 })).eq("3");
			});

			it("should also work for the arguments list", () => {
				const example3 = "{..}";
				expect(example3.weave()).eq("0");
				expect(example3.weave(1, 2, 3)).eq("3");
			});

			it("should also work for a string", () => {
				const example3 = "{0..}";
				expect(example3.weave("")).eq("0");
				expect(example3.weave("hello")).eq("5");
			});

			it("should work on looped items", () => {
				const example3 = "{0* :{!}{&..?='{&}'}}";
				const attributes = {
					class: "test hello",
					id: "best-element",
					href: "/a-cool-page",
				};
				expect(example3.weave(attributes)).eq("class='test hello' id='best-element' href='/a-cool-page'");
			});

		});

	});


	describe("with tabbification strands", () => it("should tabbify successfully", () => {
		const escape = function (str: string) {
			return str.replace(/\r/g, "\\r").replace(/\n/g, "\\n").replace(/\t/g, "\\t");
		};
		let example = "{>test\ntest}";
		expect(escape(example.weave())).eq(escape("\ttest\n\ttest"));

		example = "test\n{>test\ntest}\ntest";
		expect(escape(example.weave())).eq(escape("test\n\ttest\n\ttest\ntest"));

		example = "test\n{>>test\ntest}\ntest";
		expect(escape(example.weave())).eq(escape("test\n\t\ttest\n\t\ttest\ntest"));

		example = "{>test\n{>test\ntest}\ntest}";
		expect(escape(example.weave())).eq(escape("\ttest\n\t\ttest\n\t\ttest\n\ttest"));

		example = "test\n{>test\ntest\n{>>test\ntest\ntest}\ntest}\ntest";
		expect(escape(example.weave())).eq(escape("test\n\ttest\n\ttest\n\t\t\ttest\n\t\t\ttest\n\t\t\ttest\n\ttest\ntest"));

	}));

	describe("libraries", () => {

		describe("with strands and value types", () => {
			const TestLib: Library = {
				strands: {
					0: [
						{
							name: "foo-strand",
							match: new Chain("%^^"),
							return: () => "foobar"
						}
					],
					1: [
						{
							name: "biz-strand",
							match: new Chain("%^"),
							return: () => "bizbaz"
						}
					]
				},
				valueTypes: {
					0: [
						{
							name: "foo-value",
							match: new Chain("$^^"),
							return: () => "foobar"
						}
					],
					1: [
						{
							name: "biz-value",
							match: new Chain("$^"),
							return: () => "bizbaz"
						}
					]
				}
			};

			const testWeaver = new Weaver();
			testWeaver.addLibrary(TestLib);

			it("should weave normally", () => {
				expect(testWeaver.weave("hay there {0}", "Joe")).eq("hay there Joe");
			});
			it("should include the new strands", () => {
				expect(testWeaver.weave("biz {%^} baz")).eq("biz bizbaz baz");
				expect(testWeaver.weave("foo {%^^} bar")).eq("foo foobar bar");
			});
			it("should include the new value types", () => {
				expect(testWeaver.weave("biz {$^} baz")).eq("biz bizbaz baz");
				expect(testWeaver.weave("foo {$^^} bar")).eq("foo foobar bar");
			});

			// todo data storage tests
		});

	});
});
