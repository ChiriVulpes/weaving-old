import util = require("./util");

export enum Matchables {
    KEYS = 0, CONTENT = 1, RAWCONTENT = 2
}
export module Matchables {
    export var OPTIONAL = (...args: any[]) => ({ optional: args });
    export var REGEX = (match: string) => ({ regex: match });
    export module Matched {
        export interface KEYS {
            keys: string[];
            offset: number;
            value: any;
        }
    }
}

var KEYS = Matchables.KEYS, 
    CONTENT = Matchables.CONTENT, 
    RAWCONTENT = Matchables.RAWCONTENT, 
    OPTIONAL = Matchables.OPTIONAL, 
    REGEX = Matchables.REGEX;

export interface Segment {
    match: (number | Object)[] | number | Object;
    return: Function;
}
export interface Support extends Segment {
    name: string;
}

export class Library {
    static add(generator: (api: Object) => Support) {
        var support = generator(Matchables);
        Library.segments[support.name] = support;
    }
    static remove(name: string) {
        delete Library.segments[name];
    }
    static segments: { [key: string]: Segment } = {
        tabbification: {
            match: [ REGEX(">+"), CONTENT ],
            return: (arrows: string[], content: string) => util.tabbify(content, arrows[0].length)
        },
        output: {
            match: KEYS,
            return: (keys: Matchables.Matched.KEYS) => keys.value
        },
        conditional: {
            match: [
                KEYS, "?", RAWCONTENT, OPTIONAL( ":", RAWCONTENT )
            ],
            return: function (keys: Matchables.Matched.KEYS, _qm: string, ifTrue: string, ifFalse: string) {
                return keys.value ?(
                    this.compile(ifTrue)
                ):(
                    ifFalse ? this.compile(ifFalse[1]) : ""
                );
            }
        },
        loop: {
            match: [
                OPTIONAL( KEYS ), "*", RAWCONTENT, OPTIONAL( ":", RAWCONTENT )
            ],
            return: function (keys: Matchables.Matched.KEYS, _a: string, separator: string, replacement: string) {
                var result: string[] = [], loopable = !keys ? this.args : keys.value;
                var add = (function (i: any) {
                    this.keys.push(i);
                    this.vals.push(loopable[i]);
                    result.push(this.compile(replacement ? replacement[1] : "{&}"));
                    this.keys.pop();
                    this.vals.pop();
                }).bind(this);
                if (loopable.constructor.name == "Array") for (var i = 0; i < loopable.length; i++) add(i);
                else for (var j in loopable) add(j);
                return this.compile(result.join(separator));
            }
        }
    }
}