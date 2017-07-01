import {
	Library, API, Strand,
	Matchables, Matchable,
	Chain, Regex, Optional, Any,
	Matched,
	MatchedKeys, MatchedValue, MatchedContent, MatchedRawContent,
	MatchedChain, MatchedRegex, MatchedAnyOf, FutureMatch,
} from "weaving-api";


function nextOccurence (regex: RegExp, str: string, offset: number) {
	const occurence = regex.exec(str.slice(offset));
	return occurence && "index" in occurence ? occurence.index + occurence[0].length - 1 + offset : -1;
}

function MatchedIsContent (match: Matched): match is MatchedContent | MatchedRawContent {
	return typeof match == "object" && "nextMatch" in <any>match;
}

function generateStrandObject (): Iterable<Strand> & { [key: number]: Strand[] } {
	// tslint:disable object-literal-shorthand
	return {
		[Symbol.iterator]: function* () {
			for (const strandImportance in this) {
				for (const strand of this[strandImportance]) {
					yield strand;
				}
			}
		},
	};
	// tslint:enable object-literal-shorthand
}


import CoreLibrary from "./CoreLibrary";

export default class Weaver {
	private cursor: number;
	private args: any[];

	private data: { [key: string]: any } = {};
	private blacklist: { [key: string]: true };
	private api: API;

	private strands = generateStrandObject();
	private valueTypes = generateStrandObject();

	private str: string;
	private libs: Library[] = [];

	strict = false;

	private FormatError = class FormatError extends Error {
		message = "There was an error in your syntax, in the given string \"{0}\"";
		constructor(str: string) {
			super();
			this.message = this.message.replace("{0}", str);
		}
	};
	private UnexpectedEndError = class UnexpectedEndError extends Error {
		message = "Unexpected end of weaving string \"{0}\"";
		constructor(str: string) {
			super();
			this.message = this.message.replace("{0}", str);
		}
	};
	private ArgumentError = class ArgumentError extends Error {
		message = "There was an error using the argument identified by \"{0}\"";
		constructor(str: string) {
			super();
			this.message = this.message.replace("{0}", str);
		}
	};
	private UnsupportedError = class UnsupportedError extends Error {
		message = "Sorry, you used an currently unsupported feature: \"{0}\"";
		constructor(str: string) {
			super();
			this.message = this.message.replace("{0}", str);
		}
	};

	constructor() {
		const thisWeaver = this;
		this.api = {
			data: {
				set: <T>(name: string, value: T) => this.data[name] = value,
				get: <T>(name: string) => this.data[name] as T,
				remove: <T>(name: string) => {
					const val = this.data[name] as T;
					delete this.data[name];
					return val;
				},
			},
			get args () { return thisWeaver.args; },
		};
		this.addLibrary(CoreLibrary);
	}

	addLibrary (...libraries: Library[]) {
		this.libs.push(...libraries);
		for (const lib of libraries) {
			for (const strandImportance in lib.strands) {
				if (!Array.isArray(this.strands[strandImportance])) this.strands[strandImportance] = [];
				this.strands[strandImportance].push(...lib.strands[strandImportance]);
			}
			if (lib.valueTypes) {
				for (const valueTypeImportance in lib.valueTypes) {
					if (!Array.isArray(this.valueTypes[valueTypeImportance])) this.valueTypes[valueTypeImportance] = [];
					this.valueTypes[valueTypeImportance].push(...lib.valueTypes[valueTypeImportance]);
				}
			}
		}
	}

	weave (str: string, ...args: any[]) {
		this.str = str;
		for (const lib of this.libs) {
			if (lib.data) {
				for (const dataKey in lib.data) {
					this.api.data.set(dataKey, lib.data[dataKey]);
				}
			}
			if (lib.onWeave) lib.onWeave(this.api);
		}
		return this.startWeave(...args);
	}

	private startWeave (...args: any[]) {
		//console.log("\n\nstarting string: '" + this.str + "'");
		this.args = args;

		const oldBlacklist = this.blacklist;
		this.blacklist = {};

		let output = "";
		for (this.cursor = 0; this.cursor < this.str.length; this.cursor++) {
			const char = this.str[this.cursor];
			if (char == "~") {
				this.cursor++;
				if (this.cursor >= this.str.length) output += "~";
				else output += this.escapeChar(this.str[this.cursor]);
			} else if (char == "{") {
				output += this.findMatch();
			} else {
				output += char;
			}
		}

		this.blacklist = oldBlacklist;

		//console.log("finished with string: '" + output + "'");
		return output;
	}

	private findMatch () {
		const cursor = this.cursor + 1;
		for (const strand of this.strands) {
			this.cursor = cursor;
			const matchers = strand.match;
			// console.log("\ntrying matcher: " + strand.name);
			const matched = this.matchChain(matchers instanceof Chain ? matchers : new Chain(matchers));
			if (!matched || this.str[this.cursor] != "}") {
				// console.log("failed. made it to: '", this.str.slice(this.cursor), "'");
				continue;
			}
			// console.log("matched!");
			return strand.return.apply(this.api, matched.matches);
		}
		throw new this.FormatError(this.str);
	}
	private matchChain (chain: Chain | Optional) {
		const result: Matched = { matches: [] as Matched[] };
		for (let i = 0; i < chain.matchers.length; i++) {
			const matcher = chain.matchers[i];
			const match = this.match(matcher, chain.matchers.slice(i + 1));
			if (!match) return chain instanceof Optional ? { matches: [] as Matched[] } : undefined;
			result.matches.push(match);
			if (MatchedIsContent(match)) {
				if (match.nextMatch) {
					this.cursor = match.nextMatch.index;
					result.matches.push(match.nextMatch.match);
				}
			}
		}
		return result;
	}
	private match (matcher: Matchable, nextMatchers: Matchable[]): Matched {
		const cursor = this.cursor;
		if (typeof matcher == "string") {
			if (this.str.startsWith(matcher, this.cursor)) {
				this.cursor += matcher.length;
				return { match: matcher };
			}
		} else if (typeof matcher == "number") {
			if (matcher == Matchables.KEYS) {
				const match = this.matchKeys(nextMatchers);
				if (!match) this.cursor = cursor;
				return match;
			} else if (matcher == Matchables.VALUE) {
				const match = this.matchValueType(nextMatchers);
				if (!match) this.cursor = cursor;
				return match;
			} else if (matcher == Matchables.CONTENT || matcher == Matchables.RAWCONTENT) {
				const rawContent = this.matchContent(nextMatchers);
				return matcher == Matchables.RAWCONTENT ? rawContent : { content: rawContent.content(), nextMatch: rawContent.nextMatch };
			}
		} else if (typeof matcher == "object") {
			if (matcher instanceof Chain || matcher instanceof Optional) {
				const match = this.matchChain(matcher);
				if (!match) this.cursor = cursor;
				return match;
			} else if (matcher instanceof Any) {
				for (const option of matcher.options) {
					const match = this.match(option, nextMatchers);
					if (match) return { match };
				}
				this.cursor = cursor;
				return;
			} else if (matcher instanceof Regex) {
				const match = this.str.slice(this.cursor).match("^(?:" + matcher.regex + ")");
				if (!match) {
					this.cursor = cursor;
					return;
				}
				this.cursor += match[0].length;
				return { match };
			}
		}
	}
	private matchKeys (nextMatchers: Matchable[]): MatchedKeys {
		const startCursor = this.cursor;
		const keyCharRegex = /[~a-zA-Z0-9_-]/;
		if (!keyCharRegex.test(this.str[this.cursor])) return;
		const keys: string[] = [];
		let key = "";
		for (this.cursor; this.cursor < this.str.length; this.cursor++) {
			if (this.str[this.cursor] == "~") {
				if (this.cursor++ > this.str.length) throw new this.UnexpectedEndError(this.str);
				key += this.escapeChar(this.str[this.cursor]);
				continue;
			}
			if (this.str[this.cursor] == ".") {
				if (key.length > 0) {
					keys.push(key);
					key = "";
					if (keyCharRegex.test(this.str[this.cursor + 1])) continue;
				}
				break;
			}
			if (!keyCharRegex.test(this.str[this.cursor])) break;
			key += this.str[this.cursor];
		}
		if (key.length > 0) keys.push(key);
		if (this.cursor == this.str.length) throw new this.UnexpectedEndError(this.str);
		return { keys, value: this.getValue.bind(this, keys) };
	}
	private matchValueType (nextMatchers: Matchable[]): MatchedValue {
		const startCursor = this.cursor;
		for (const valueType of this.valueTypes) {
			if (this.blacklist[valueType.name]) continue;
			if (valueType.blacklist) this.blacklist[valueType.name] = true;

			this.cursor = startCursor;

			const matchers = valueType.match instanceof Chain ? valueType.match : new Chain(valueType.match);
			const match = this.matchChain(matchers);

			delete this.blacklist[valueType.name];

			if (!match) continue;
			else return { value: valueType.return.bind(this.api, ...match.matches) };
		}
		this.cursor = startCursor;
		return this.matchKeys(nextMatchers);
	}
	private escapeChar (char: string) {
		return char;
	}
	private matchContent (nextMatchers: Matchable[]): MatchedRawContent {
		const startCursor = this.cursor;
		let content = "",
			nextMatch: FutureMatch,
			layers = 0;
		for (this.cursor; this.cursor < this.str.length; this.cursor++) {
			if (this.str[this.cursor] == "~") {
				if (this.cursor++ > this.str.length) throw new this.UnexpectedEndError(this.str.slice(startCursor));
				content += this.escapeChar(this.str[this.cursor]);
				continue;
			} else if (this.str[this.cursor] == "{") {
				layers++;
			} else if (this.str[this.cursor] == "}" && layers > 0) {
				layers--;
			} else {
				if (this.str[this.cursor] == "}" && layers == 0) break;
				nextMatch = this.matchNext(nextMatchers);
				if (nextMatch && layers == 0) break;
				content += this.str[this.cursor];
			}
		}
		if (this.cursor == this.str.length) throw new this.UnexpectedEndError(this.str.slice(startCursor));
		const str = this.str.slice(startCursor, this.cursor);
		return {
			content: () => {
				const strSave = this.str, cursorSave = this.cursor;
				this.str = str, this.cursor = 0;
				const result = this.startWeave(...this.args);
				this.str = strSave, this.cursor = cursorSave;
				return result;
			}, nextMatch,
		};
	}
	private getValue (keys: string[], err = true) {
		let result: any = this.args;
		for (let i = 0; i < keys.length; i++) {
			let key = keys[Math.floor(i)];
			if (i == 0 && isNaN(key as any)) key = "0", i = -0.5;
			if (!(key in result)) {
				if (err) throw new this.ArgumentError(keys.join("."));
				return;
			}
			result = result[key];
		}
		return result;
	}
	private matchNext (nextMatchers: Matchable[]): FutureMatch {
		const startCursor = this.cursor;
		const result: FutureMatch = {} as FutureMatch;
		for (let i = 0; i < nextMatchers.length; i++) {
			const nextMatcher = nextMatchers[i];
			result.match = this.match(nextMatcher, nextMatchers.slice(i));
			if (nextMatcher instanceof Optional && (result.match as { matches: Matched[] }).matches.length == 0) {
				result.match = undefined;
				continue;
			}
			break;
		}
		result.index = this.cursor;
		this.cursor = startCursor;
		if (result.match) return result;
	}
}
