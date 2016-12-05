export enum Matchables {
    KEYS = 0, VALUE = 1, CONTENT = 2, RAWCONTENT = 3
}
export module Matchables {
    export class Optional {
        matchers: Matchable[];
        constructor (...args: Matchable[]) { this.matchers = args; }
    }
    export class Any {
        options: Matchable[];
        constructor (...args: Matchable[]) { this.options = args; }
    }
    export class Regex {
        constructor (public regex: string) {}
    }
    export class Chain {
        matchers: Matchable[];
        constructor (...args: Matchable[]) { this.matchers = args; }
    }
}
export let Optional = Matchables.Optional,
    Any = Matchables.Any,
    Regex = Matchables.Regex,
    Chain = Matchables.Chain;
export type Optional = Matchables.Optional;
export type Any = Matchables.Any;
export type Regex = Matchables.Regex;
export type Chain = Matchables.Chain;

export type Matchable = string | Matchables |
    Matchables.Optional | Matchables.Any | Matchables.Regex | Matchables.Chain;

export type Matched = string | MatchedKeys | MatchedValue | MatchedContent | MatchedRawContent |
    MatchedChain<any> | MatchedAnyOf<any> | MatchedRegex;

export interface MatchedValue {
    /**
     * Get the weave argument provided for these keys. 
     * Errors if the value doesn't exist in the weave arguments, 
     * unless 'false' is provided to the 'err' param.
     */
    value: (err?: boolean) => any;
}
export interface MatchedKeys extends MatchedValue {
    keys: string[];
}
export interface MatchedContent {
    content: string;
    nextMatch: FutureMatch;
};
export interface MatchedRawContent {
    content: () => string;
    nextMatch: FutureMatch;
}
export interface MatchedChain<T> {
    matches: T & Matched[];
}
export interface MatchedAnyOf<T extends Matched> {
    match: T;
}
export interface MatchedRegex {
    match: RegExpMatchArray;
}
export interface FutureMatch {
    match: Matched;
    index: number;
}

export interface Strand {
    name: string;
    match: Matchable;
    return: Function;
}

export interface API {
    data: {
        get<T> (name: string): T;
        set<T> (name: string, value: T): T;
        remove<T> (name: string): T;
    };
    readonly args: any[];
}

export abstract class Library {
    data?: { [key: string]: any };
    valueTypes?: { [key: number]: Strand[] };
    onWeave? (api: API): void;
    strands?: { [key: number]: Strand[] };
}
