declare module weaving {
	export module StringUtils {
		function padLeft(str: string, len: number, pad: string): string;
		function padRight(str: string, len: number, pad: string): string;
		function capitalize(str: string, offset?: number): string;
		function tailsMatch(str: string, startsWith: string, endsWith: string): boolean;
		function tabbify(str: string, tabs: number): string;
	}
	export enum Matchables {
	    KEYS = 0,
	    CONTENT = 1,
	    RAWCONTENT = 2,
	}
	export module Matchables {
	    var OPTIONAL: (...args: any[]) => {
	        optional: any[];
	    };
	    var REGEX: (match: string) => {
	        regex: string;
	    };
	    module Matched {
	        interface KEYS {
	            keys: string[];
	            offset: number;
	            value: any;
	        }
	    }
	}
	export interface Segment {
	    match: (number | Object)[] | number | Object;
	    return: Function;
	}
	export interface Support extends Segment {
	    name: string;
	}
	export module library {
	    function add(generator: (api: Object) => Support): void;
	    function remove(name: string): void;
	    var segments: {
	        [key: string]: Segment;
	    };
	}
    export function trimError(errorOrStack: Error | string): string;
    export function weave(weaving: string, ...using: any[]): string;
    export function weaveIgnore(weaving: string, ...using: any[]): string;
    export abstract class Error {
        name: string;
        message: string;
        protected _stack: string;
        protected _where: any;
        stack: string;
        constructor(...using: any[]);
    }
}
export = weaving;