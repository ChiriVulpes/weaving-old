/// <reference path="types.d.ts" />

import * as Lib from "./library";
import util = require("./util");

var NativeError = Error;
module weaving {
    export function trimError(errorOrStack: Error | string) {
        var stack = errorOrStack instanceof Error ? errorOrStack.stack : errorOrStack;
        return stack.replace(/^[^\n]*\r?\n/, "");
    }
    export function weave(weaving: string, ...using: any[]) {
        return new weaver(weaving).weave(...using);
    }
    export function weaveIgnore(weaving: string, ...using: any[]) {
        return new weaver(weaving, true).weave(...using);
    }

    export var StringUtils = util;
    export var library = Lib.Library;
    export var Matchables = Lib.Matchables;
    export type Segment = Lib.Segment;
    export type Support = Lib.Support;

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
                var result = weaving.weave.apply(null, this.using);
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
            var result = {};
            (this as any)["prototype"] = new NativeError;
            var e: any = {};
            (NativeError as any).captureStackTrace(e, this._where === undefined ? this.constructor : this._where);
            this._stack = e.stack;
        }
    }
}

class FormatError extends weaving.Error {
    weavingMessage = 'There was an error in your syntax, in the given string "{0}"';
}
class ArgumentError extends weaving.Error {
    weavingMessage = 'There was an error using the argument identified by "{0}"';
}
class UnsupportedError extends weaving.Error {
    weavingMessage = 'Sorry, you used an currently unsupported feature: "{0}"';
}


var nextOccurence = function (regex: RegExp, str: string, offset: number) {
    var occurence = regex.exec(str.slice(offset));
    return occurence && "index" in occurence ? occurence.index + occurence[0].length - 1 + offset : -1;
};

class weaver {

    cursor = -1;
    args: any[];
    keys: string[];
    vals: any[];
    segments: any[];
    result: string;
    indent: number;

    constructor (public str: string, private strict = false) {
        this.cursor = -1;
    }

    weave (...args: any[]) {
        this.keys = [];
        this.vals = [];
        this.segments = [];
        this.result = "";
        this.args = args;
        this.indent = -1;
        try {
            this.extract();
            this.result = this.compile(this.str)
                .replace(/\.~\[/g, "~{")
                .replace(/\.~\]/g, "~}")
                .replace(/(~{2,})([\[\]])/g, function (match: string, escapes: string, escaped: string) {
                    return escapes.slice(2) + escaped;
                }).replace(/~(.)/g, "$1");
        } catch (error) {
            throw error;
        }
        return this.result;
    }
    extract () {
        var str = this.str
            .replace(/(~*)\[/g, "$1~~[")
            .replace(/(~*)\]/g, "$1~~]")
            .replace(/~\{/g, ".~[")
            .replace(/~\}/g, ".~]");
        var args = Array.prototype.slice.apply(arguments, [1]);
        var segments: string[] = [];
        var didSomething: boolean;
        do {
            didSomething = false;
            str = str.replace(/(^|[^~])({[^{}]*})/g, function(match: string, backmatch: string, capture: string) {
                didSomething = true;
                segments.push(capture);
                return backmatch + "[!" + (segments.length - 1) + "]";
            });
        } while (didSomething);
        this.str = str;
        this.segments = segments;
    }
    compile (str: string): string {
        var result: any;
        this.indent++;
        var error = new Error;
        if (util.tailsMatch(str, "{", "}")) {

            var matched = this.findMatch(str.slice(1, -1));
            if (!matched) throw new Error("Couldn't match the input string '" + str.slice(1, -1) + "'");

            result = matched.segment.return.apply(this, matched.matched);

            this.indent--;
        } else {
            var _this = this;
            result = str.replace(/\[!(\d+)\]/g, function (match, index) {
                var r = _this.compile(_this.segments[parseInt(index)]);
                return r;
            });
            this.indent--;
        }
        return result;
        //throw error;
    }
    findMatch (str: string): { segment: Lib.Segment, matched: boolean } {
        var matchable = false, str = str, segment = "", matched: any;
        this.indent++;
        for (segment in weaving.library.segments) {
            var matchers = weaving.library.segments[segment].match;
            matched = this.match(str, Array.isArray(matchers) ? matchers : [matchers]);
            if (matched) break;
        }
        this.indent--;
        return matched ? { segment: weaving.library.segments[segment], matched: matched } : undefined;
    }
    match (str: string, matchers: any[], sub = false): { length: number, matched: any[] } | any[] {
        var matched: any[] = [], offset = 0;
        for (var i = 0; i < matchers.length; i++) {
            var match: any;
            switch (typeof matchers[i]) {
                case "string": {
                    if (str.substr(offset, matchers[i].length) == matchers[i]) {
                        match = matchers[i];
                        offset += matchers[i].length;
                    } else return;
                    break;
                }
                case "number": {
                    if (matchers[i] == KEYS) {
                        match = {};
                        match.keys = this.getKeys(str.slice(offset));
                        if (!match.keys) return;
                        offset += match.keys.offset;
                        match.keys = match.keys.keys;
                        match.value = match.keys ? this.getValue(match.keys) : undefined;
                        break;
                    }
                    if (matchers[i] == RAWCONTENT || matchers[i] == CONTENT) {
                        var next = matchers.length == i + 1 ? "" : matchers[i + 1],
                            str2 = str.slice(offset),
                            nextOffset: any = 0,
                            optional = false;

                        if (typeof next == "object")
                            if ("optional" in next) next = next.optional, optional = true;

                        if (Array.isArray(next)) next = next[0];

                        if (typeof next == "string") {
                            nextOffset = RegExp("((?:^|[^~])(?:~~)*)" + next).exec(str2);
                            nextOffset = nextOffset ? nextOffset.index + nextOffset[1].length : -1;

                            if ((nextOffset == -1 && optional) || matchers.length == i + 1) nextOffset = str2.length;
                            match = str2.slice(0, nextOffset);
                            if (matchers[i] == CONTENT) match = this.compile(match);
                        } else throw new Error;
                        offset += nextOffset;
                        break;
                    }
                    throw new Error("unknown segment type");
                }
                case "object": {
                    if (Array.isArray(matchers[i])) {
                        match = this.match(str.slice(offset), matchers[i], true);
                        offset += match.length;
                        match = match.matched;
                    } else {
                        if ("optional" in matchers[i]) {
                            match = this.match(str.slice(offset), matchers[i].optional, true);
                            if (match) {
                                if (typeof match == "object") offset += match.length;
                                if (Array.isArray(match.matched) && match.matched.length == 1) match.matched = match.matched[0];
                                match = [match.matched];
                            }
                        } else if ("regex" in matchers[i]) {
                            match = str.slice(offset).match("^" + matchers[i].regex);
                            if (!match) return;
                            offset += match[0].length;
                            match = [match];
                        } else throw new Error("invalid match type");
                    }
                }
            }
            matched.push.apply(matched, Array.isArray(match) ? match : [match]);
        }
        if (!sub && offset < str.length) return;
        return sub ? { length: offset, matched: matched } : matched;
    }
    getKeys (str: string): { keys: string[], offset: number } {
        if (!/[\.&!~a-zA-Z0-9_-]/.test(str[0])) return;
        var keys: string[] = [], key = "", checkingLength = false;
        for (var i = 0; i < str.length && !/[?*:}]/.test(str[i]); i++) {
            if (str[i] == "~") {
                if (i++ > str.length) return;
                key += this.escapeChar(str[i]);
                continue;
            }
            if (str[i] == ".") {
                var cont = false;
                if (key.length > 0) {
                    keys.push(key);
                    key = "";
                    cont = true;
                }
                if (str[i + 1] == ".") {
                    if (/\?|$/.test(str.slice(i + 2))) {
                        i += 2;
                        checkingLength = true;
                        break;
                    } else {
                        if (this.strict) throw new FormatError(weaver.prototype.weave, str);
                    }
                }
                if (cont) continue;
            }
            key += str[i];
        }
        if (key.length > 0) keys.push(key);
        if (checkingLength) (keys as any).push({"checkingLength": true});
        return { keys: keys.length > 0 ? keys : undefined, offset: i};
    }
    escapeChar (char: string) {
        return char;
    }
    getValue (keys: (string | Object)[]): any {
        var val: any = keys[0] == "&" ? this.vals : keys[0] == "!" ? this.keys : this.args;
        if (typeof keys[0] == "string") {
            var key = keys[0] as string;
            if (/[&!]/.test(key[0])) {
                if (key.length == 1) {
                    key += "-1";
                }
                keys.unshift(key[0]);
                keys[1] = key.slice(1);
                if (!key.match(/^0|-?[1-9]\d*$/)) return undefined;
            } else {
                var number = key.match(/^0|[1-9]\d*$/);
                if (!number || number[0].length != key.length) {
                    keys.unshift('0');
                }
            }
            if (key.match(/[&!]/)) keys.shift();
        }
        for (var i = 0; i < keys.length; i++) {
            if (typeof keys[i] == "object" || !(typeof val == "object" && (keys[i] as string) in val)) {
                if (typeof keys[i] == "object" && (keys[i] as any)["checkingLength"]) {
                    if (Array.isArray(val) || typeof val == "string") val = val.length;
                    else if (typeof val == "object") val = Object.keys(val).length;
                    else throw new Error("invalid value to check length of");
                    break;
                } else if (typeof val == "object") {
                    
                    if ((keys[i] as string).match(/-[1-9]\d*/)) keys[i] = val.length + Number(keys[i]); // if negative we're grabbing from backwards
                    else return undefined;
                    if (Math.sign((keys[i] as number)) == -1) return undefined; // if it's still negative we subtracted too much, so error
                }
            }
            if (typeof val != "object") return undefined;
            val = val[keys[i] as string];
        }
        return typeof val == "string" ? val.replace(/~/g, "~~").replace(/(~+)\[/g, "$1~~[") : val;
    }
}


var KEYS = 0, CONTENT = 1, RAWCONTENT = 2;

export = weaving;