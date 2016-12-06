/// <reference path="types.d.ts" />

import {
    Library, API, Strand,
    Matchables, Matchable,
    Chain, Regex, Optional, Any,
    Matched,
    MatchedKeys, MatchedValue, MatchedContent, MatchedRawContent,
    MatchedChain, MatchedRegex, MatchedAnyOf, FutureMatch
} from "./library";
import { Core } from "./core";
require("./util");

let NativeError = Error;

let strands: Iterable<Strand> & { [key: number]: Strand[] } = {
    [Symbol.iterator]: function* () {
        for (let strandImportance in strands) {
            for (let strand of strands[strandImportance]) {
                yield strand;
            }
        }
    }
};
let valueTypes: Iterable<Strand> & { [key: number]: Strand[] } = {
    [Symbol.iterator]: function* () {
        for (let strandImportance in valueTypes) {
            for (let valueType of valueTypes[strandImportance]) {
                yield valueType;
            }
        }
    }
};
let libs: Library[] = [];

module weaving {
    export function trimError(errorOrStack: Error | string) {
        let stack = errorOrStack instanceof Error ? errorOrStack.stack : errorOrStack;
        return stack.replace(/^[^\n]*\r?\n/, "");
    }
    export function weave(weaving: string, ...using: any[]) {
        return new Weaver(weaving).startWeave(...using);
    }
    export function weaveIgnore(weaving: string, ...using: any[]) {
        return new Weaver(weaving, true).startWeave(...using);
    }

    export function addStrands (...libraries: Library[]) {
        libs.push(...libraries);
        for (let lib of libraries) {
            for (let strandImportance in lib.strands) {
                if (!Array.isArray(strands[strandImportance])) strands[strandImportance] = [];
                strands[strandImportance].push(...lib.strands[strandImportance]);
            }
            if (lib.valueTypes) {
                for (let valueTypeImportance in lib.valueTypes) {
                    if (!Array.isArray(valueTypes[valueTypeImportance])) valueTypes[valueTypeImportance] = [];
                    valueTypes[valueTypeImportance].push(...lib.valueTypes[valueTypeImportance]);
                }
            }
        }
    }

    export abstract class Error {
        name: string;
        protected weavingMessage: string;
        private _stack: string;
        private _where: Function;

        public get stack() {
            return this._stack.replace(/^[^\n]*(?=\n)/, this.name + ": " + this.message);
        }
        public get message() {
            this.using.unshift(this.weavingMessage);
            try {
                let result = weaving.weave.apply(null, this.using);
                this.using.shift();
                return result;
            } catch (error) {
                throw error;
            }
        }

        private using: any[];

        constructor(...using: any[]);
        constructor(where: Function, ...using: any[]) {
            if (!this.name) this.name = this.constructor.name;

            if (typeof where == "function") this._where = where;
            else using.unshift(where);

            this.using = using;
            let result = {};
            (this as any)["prototype"] = new NativeError;
            let e: any = {};
            (NativeError as any).captureStackTrace(e, this._where === undefined ? this.constructor : this._where);
            this._stack = e.stack;
        }
    }
}

weaving.addStrands(Core);

class FormatError extends weaving.Error {
    weavingMessage = 'There was an error in your syntax, in the given string "{0}"';
}
class UnexpectedEndError extends weaving.Error {
    weavingMessage = 'Unexpected end of weaving string "{0}"';
}
class ArgumentError extends weaving.Error {
    weavingMessage = 'There was an error using the argument identified by "{0}"';
}
class UnsupportedError extends weaving.Error {
    weavingMessage = 'Sorry, you used an currently unsupported feature: "{0}"';
}


let nextOccurence = function (regex: RegExp, str: string, offset: number) {
    let occurence = regex.exec(str.slice(offset));
    return occurence && "index" in occurence ? occurence.index + occurence[0].length - 1 + offset : -1;
};

function MatchedIsContent (match: Matched): match is MatchedContent | MatchedRawContent {
    return typeof match == "object" && "nextMatch" in <any>match;
}

class Weaver {
    cursor: number;
    output: string;
    args: any[];

    data: { [key: string]: any } = {};
    api: API;

    constructor (public str: string, private strict = false) {
        let _this = this;
        this.api = {
            data: {
                set: <T>(name: string, value: T) => this.data[name] = value,
                get: <T>(name: string) => this.data[name] as T,
                remove: <T>(name: string) => {
                    let val = this.data[name] as T;
                    delete this.data[name];
                    return val;
                }
            },
            get args () { return _this.args; }
        };
    }

    startWeave (...args: any[]) {
        for (let lib of libs) {
            if (lib.data) {
                for (let dataKey in lib.data) {
                    this.api.data.set(dataKey, lib.data[dataKey]);
                }
            }
            if (lib.onWeave) lib.onWeave(this.api);
        }
        return this.weave(...args);
    }

    weave (...args: any[]) {
        //console.log("\n\nstarting string: '" + this.str + "'");
        this.args = args;
        this.output = "";
        for (this.cursor = 0; this.cursor < this.str.length; this.cursor++) {
            let char = this.str[this.cursor];
            if (char == "~") {
                this.cursor++;
                if (this.cursor >= this.str.length) this.output += "~";
                else this.output += this.escapeChar(this.str[this.cursor]);
            } else if (char == "{") {
                this.output += this.findMatch();
            } else {
                this.output += char;
            }
        }
        //console.log("finished with string: '" + this.output + "'");
        return this.output;
    }

    findMatch () {
        let cursor = this.cursor + 1;
        for (let strand of strands) {
            this.cursor = cursor;
            let matchers = strand.match;
            //console.log("\ntrying matcher: " + strand.name);
            let matched = this.matchChain(matchers instanceof Chain ? matchers : new Chain(matchers));
            if (!matched || this.str[this.cursor] != "}") {
                //console.log("failed. made it to: '", this.str.slice(this.cursor), "'");
                continue;
            }
            //console.log("matched!");
            return strand.return.apply(this.api, matched.matches);
        }
        throw new FormatError(this.str);
    }
    matchChain (chain: Chain | Optional) {
        let result: Matched = { matches: [] as Matched[] };
        for (let i = 0; i < chain.matchers.length; i++) {
            let matcher = chain.matchers[i];
            let match = this.match(matcher, chain.matchers.slice(i + 1));
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
    match (matcher: Matchable, nextMatchers: Matchable[]): Matched {
        let cursor = this.cursor;
        if (typeof matcher == "string") {
            if (this.str.startsWith(matcher, this.cursor)) {
                this.cursor += matcher.length;
                return { match: matcher };
            }
        } else if (typeof matcher == "number") {
            if (matcher == Matchables.KEYS) {
                let match = this.matchKeys(nextMatchers);
                if (!match) this.cursor = cursor;
                return match;
            } else if (matcher == Matchables.VALUE) {
                let match = this.matchValueType(nextMatchers);
                if (!match) this.cursor = cursor;
                return match;
            } else if (matcher == Matchables.CONTENT || matcher == Matchables.RAWCONTENT) {
                let rawContent = this.matchContent(nextMatchers);
                return matcher == Matchables.RAWCONTENT ? rawContent : { content: rawContent.content(), nextMatch: rawContent.nextMatch };
            }
        } else if (typeof matcher == "object") {
            if (matcher instanceof Chain || matcher instanceof Optional) {
                let match = this.matchChain(matcher);
                if (!match) this.cursor = cursor;
                return match;
            } else if (matcher instanceof Any) {
                for (let option of matcher.options) {
                    let match = this.match(option, nextMatchers);
                    if (match) return { match };
                }
                this.cursor = cursor;
                return;
            } else if (matcher instanceof Regex) {
                let match = this.str.slice(this.cursor).match("^(?:" + matcher.regex + ")");
                if (!match) {
                    this.cursor = cursor;
                    return;
                }
                this.cursor += match[0].length;
                return { match };
            }
        }
    }
    matchKeys (nextMatchers: Matchable[]): MatchedKeys {
        let startCursor = this.cursor;
        let keyCharRegex = /[~a-zA-Z0-9_-]/;
        if (!keyCharRegex.test(this.str[this.cursor])) return;
        let keys: string[] = [],
            key = "";
        for (this.cursor; this.cursor < this.str.length; this.cursor++) {
            if (this.str[this.cursor] == "~") {
                if (this.cursor++ > this.str.length) throw new UnexpectedEndError(this.str);
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
        if (this.cursor == this.str.length) throw new UnexpectedEndError(this.str);
        return { keys, value: this.getValue.bind(this, keys) };
    }
    matchValueType (nextMatchers: Matchable[]): MatchedValue {
        let startCursor = this.cursor;
        for (let valueType of valueTypes) {
            this.cursor = startCursor;
            let matchers = valueType.match instanceof Chain ? valueType.match : new Chain(valueType.match);
            let match = this.matchChain(matchers);
            if (!match) continue;
            else return { value: valueType.return.bind(this.api, ...match.matches) };
        }
        this.cursor = startCursor;
        return this.matchKeys(nextMatchers);
    }
    escapeChar (char: string) {
        return char;
    }
    matchContent (nextMatchers: Matchable[]): MatchedRawContent {
        let startCursor = this.cursor;
        let content = "",
            nextMatch: FutureMatch,
            layers = 0;
        for (this.cursor; this.cursor < this.str.length; this.cursor++) {
            if (this.str[this.cursor] == "~") {
                if (this.cursor++ > this.str.length) throw new UnexpectedEndError(this.str.slice(startCursor));
                content += this.escapeChar(this.str[this.cursor]);
                continue;
            } else if (this.str[this.cursor] == "{") {
                layers++;
            } else if (this.str[this.cursor] == "}" && layers > 0) {
                layers--;
            } else {
                if (this.str[this.cursor] == "}" && layers == 0) break;
                nextMatch = this.matchNext(nextMatchers);
                if (nextMatch || (this.str[this.cursor] == "}" && layers == 0)) break;
                content += this.str[this.cursor];
            }
        }
        if (this.cursor == this.str.length) throw new UnexpectedEndError(this.str.slice(startCursor));
        let str = this.str.slice(startCursor, this.cursor);
        return { content: () => {
            let strSave = this.str, cursorSave = this.cursor;
            this.str = str, this.cursor = 0;
            let result = this.weave(...this.args);
            this.str = strSave, this.cursor = cursorSave;
            return result;
        }, nextMatch };
    }
    getValue (keys: string[], err = true) {
        let result: any = this.args;
        for (let i = 0; i < keys.length; i++) {
            let key = keys[Math.floor(i)];
            if (i == 0 && isNaN(key as any)) key = "0", i = -0.5;
            if (!(key in result)) {
                if (err) throw new ArgumentError(keys.join("."));
                return;
            }
            result = result[key];
        }
        return result;
    }
    matchNext (nextMatchers: Matchable[]): FutureMatch {
        let startCursor = this.cursor;
        let result: FutureMatch = {} as FutureMatch;
        for (let i = 0; i < nextMatchers.length; i++) {
            let nextMatcher = nextMatchers[i];
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

export = weaving;