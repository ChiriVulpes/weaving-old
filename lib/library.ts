import util = require("./util");

export enum Matchables {
    KEYS = 0, CONTENT = 1, RAWCONTENT = 2
}
export module Matchables {
    export let OPTIONAL = (...args: any[]) => ({ optional: args });
    export let REGEX = (match: string) => ({ regex: match });
    export module Matched {
        export interface KEYS {
            keys: string[];
            offset: number;
            value: any;
        }
    }
}

let KEYS = Matchables.KEYS, 
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

export module Library {
    export type Generator = (api: typeof Matchables) => Support;
    export function add (generator: Generator) {
        let support = generator(Matchables);
        Library.segments[support.name] = support;
    }
    export function remove (name: string) {
        delete Library.segments[name];
    }
    export let segments: { [key: string]: Segment } = {
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
                KEYS, REGEX("!?\\?"), RAWCONTENT, OPTIONAL( ":", RAWCONTENT )
            ],
            return: function (keys: Matchables.Matched.KEYS, conditionalTypeMatch: RegExpMatchArray, ifTrue: string, ifFalse: string) {
                let pass = keys.value;
                let conditionalType = conditionalTypeMatch[0];
                if (conditionalType == "!?") pass = !pass;
                return pass ?(
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
                let result: string[] = [], loopable = !keys ? this.args : keys.value;
                let add = (function (i: any) {
                    this.keys.push(i);
                    this.vals.push(loopable[i]);
                    result.push(this.compile(replacement ? replacement[1] : "{&}"));
                    this.keys.pop();
                    this.vals.pop();
                }).bind(this);
                if (loopable.constructor.name == "Array") for (let i = 0; i < loopable.length; i++) add(i);
                else for (let j in loopable) add(j);
                return this.compile(result.join(separator));
            }
        }
    }
}