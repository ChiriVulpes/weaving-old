import util = require("./util");

import {
    Library, API,
    Matchables, Matchable,
    Chain, Regex, Optional, Any,
    Matched,
    MatchedKeys, MatchedValue, MatchedContent, MatchedRawContent,
    MatchedChain, MatchedRegex, MatchedAnyOf
} from "./library";

const KEYS = Matchables.KEYS,
    VALUE = Matchables.VALUE,
    CONTENT = Matchables.CONTENT,
    RAWCONTENT = Matchables.RAWCONTENT;

function MatchedIsValue(match: any): match is MatchedValue {
    return "value" in match;
}

function compareValues(operator: "==" | "!=" | "<=" | ">=" | "<" | ">" | "<<", val1: any, val2: any) {
    switch (operator) {
        case "==": return val1 === val2;
        case "!=": return val1 !== val2;
        case "<": return val1 < val2;
        case ">": return val1 > val2;
        case "<=": return val1 <= val2;
        case ">=": return val1 >= val2;
        case "<<": {
            if (typeof val2 == "object") {
                if (Array.isArray(val2)) return val2.indexOf(val1) >= 0;
                else return ("" + val1) in val2;
            } else if (typeof val2 == "string") return val2.indexOf("" + val1) >= 0;
        }
    }
}

export class CoreLibrary extends Library {
    data = {
        keys: [] as string[],
        vals: [] as (string | number)[]
    };
    valueTypes = {
        0: [
            {
                name: "with-length",
                match: new Chain(new Optional(VALUE), ".."),
                blacklist: true,
                return(this: API, ifValue: MatchedChain<{ 0: MatchedValue }>) {
                    let val = ifValue.matches.length > 0 ? ifValue.matches[0].value(false) : this.args;
                    if (!val) return 0;
                    else if (typeof val == "string" || Array.isArray(val)) return val.length;
                    else if (typeof val == "object") return Object.keys(val).length;
                }
            },
        ],
        1: [
            {
                name: "key-or-val",
                match: new Regex("(!|&)(\\d+)?"), // TODO add keys after this
                return(this: API, match: MatchedRegex) {
                    let type = match.match[1],
                        entriesUpward = +match.match[2];
                    if (!entriesUpward) entriesUpward = 0;
                    let entries = this.data.get<any[]>(type == "!" ? "keys" : "vals");
                    return entries[entries.length - entriesUpward - 1];
                }
            },
            {
                name: "string-or-number",
                match: new Regex("(\"|'|`)((?:(?!~|\\1).|~.)*)\\1|~(\\d+(?:\\.\\d+)?)"),
                return(match: MatchedRegex): any {
                    if (match.match[3]) return +match.match[3];
                    else return match.match[2];
                }
            }
        ],
    };
    strands = {
        0: [
            {
                name: "tabbification",
                match: new Chain(new Regex(">+"), CONTENT),
                return: (arrows: MatchedRegex, content: MatchedContent) =>
                    util.tabbify(content.content, arrows.match[0].length)
            }
        ],
        1: [
            {
                name: "output",
                match: VALUE,
                return: (keys: MatchedValue) => keys.value()
            }
        ],
        3: [
            {
                name: "conditional",
                match: new Chain(
                    VALUE,
                    new Optional( // if we're comparing the value of the keys
                        new Regex("(==|!=|<=|>=|<<?|>)"), // valid operators
                        VALUE
                    ),
                    new Regex("!?\\?"), // whether this is an inverse conditional
                    RAWCONTENT,
                    new Optional(":", RAWCONTENT) // if it includes an else half of the conditional
                ),
                return(
                    keys: MatchedValue,
                    comparisonMatch: MatchedChain<{
                        0: MatchedRegex,
                        1: MatchedValue
                    }>,
                    conditionalType: MatchedRegex,
                    ifTrue: MatchedRawContent,
                    ifFalse: MatchedChain<{
                        1: MatchedRawContent
                    }>
                ) {
                    let val = keys.value(false);
                    let pass: boolean;
                    if (comparisonMatch.matches.length > 0) {
                        let against = comparisonMatch.matches[1].value(false);
                        pass = compareValues(comparisonMatch.matches[0].match[0] as any, val, against);
                    } else pass = !!val;

                    if (conditionalType.match[0] == "!?") pass = !pass;
                    return pass ? (
                        ifTrue.content()
                    ) : (
                            ifFalse.matches.length > 0 ? ifFalse.matches[1].content() : ""
                        );
                }
            },
            {
                name: "loop",
                match: new Chain(
                    new Optional(VALUE),
                    "*", RAWCONTENT,
                    new Optional(":", RAWCONTENT)
                ),
                return(this: API,
                    ifKeys: MatchedChain<{
                        0: MatchedValue
                    }>,
                    _symbol: string,
                    rawSeparator: MatchedRawContent,
                    ifReplacesValue: MatchedChain<{
                        1: MatchedRawContent
                    }>
                ) {
                    let result: string[] = [],
                        loopable: any,
                        replacesValue = ifReplacesValue.matches.length > 0,
                        separator = rawSeparator.content();


                    if (ifKeys.matches.length > 0) {
                        let match = ifKeys.matches[0];
                        loopable = match.value();
                    } else loopable = this.args;

                    let data = {
                        keys: this.data.get<(string | number)[]>("keys"),
                        vals: this.data.get<any[]>("vals")
                    };

                    let add = (key: string | number) => {
                        if (replacesValue) {
                            data.keys.push(key);
                            data.vals.push(loopable[key]);
                            result.push(ifReplacesValue.matches[1].content());
                            data.keys.pop();
                            data.vals.pop();
                        } else {
                            result.push(loopable[key]);
                        }
                    };

                    if (Array.isArray(loopable)) for (let i = 0; i < loopable.length; i++) add(i);
                    else for (let j in loopable) add(j);
                    return result.join(separator);
                }
            }
        ]
    };
}

export let Core = new CoreLibrary;