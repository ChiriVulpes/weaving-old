var proto = function (protos, to, replace, prototype) {
    for (var fname in protos) {
        (function (fn, lib) {
            var keys = protos[fn];
            if (!(fn in lib)) {
                fn = fn.split(".");
                if (fn.length > 1) {
                    for (var i = 0; i < fn.length - 1; i++) {
                        if (fn[i] in lib) lib = lib[fn[i]];
                        else return;
                    }
                    fn = fn[fn.length - 1];
                } else return;
            }
            if (replace || !(fn in to.prototype)) {
                if (typeof keys == "string") keys = [keys];
                if (keys.constructor.name == "Array") {
                    if (prototype === undefined) prototype = true;
                    var func = function () {
                        if (prototype) Array.prototype.unshift.apply(arguments, [this]);
                        return lib[fn].apply(null, arguments);
                    };
                    var to2 = prototype ? to.prototype : to;
                    for (var i = 0; i < keys.length; i++) to2[keys[i] == "&" ? fn : keys[i]] = func;
                }
            }
            if (lib[fn].constructor.name == "Object") {
                proto(lib[fn], to, replace);
            }
        })(fname, weaving);
    }
};

var weaving = String.weaving = module.exports = {
    errors: {
        create: function (name, message, where) {
            return function () {
                this.prototype = new Error;
                this.name = name;
                Array.prototype.unshift.apply(arguments, [message]);
                try {
                    this.message = String.weaving.weave.apply(String.weaving, arguments);
                } catch (error) {
                    throw error;
                    this.message = message;
                }
                Error.captureStackTrace(this, where === undefined ? this.constructor : where);
                this.stack = this.stack.replace(/^[^\n]*(?=\n)/, this.name + ": " + this.message);
            }
        },
        trim: function (errorOrStack) {
            var stack = errorOrStack instanceof Error ? errorOrStack.stack : errorOrStack;
            return stack.replace(/^[^\n]*\r?\n/, "");
        },
    },
    applyProtos: function (replace, to, which) {
        if (which === undefined) {
            proto(protos.string, String, replace);
            proto(protos.error, Error, replace, false);
        } else {
            proto(which, to, replace);
        }
    },
    weaveIgnore: function (str) {
        return new weave (str, Array.prototype.slice.apply(arguments, [1])).weave();
    },
    weave: function (str) {
        return new weave (str, Array.prototype.slice.apply(arguments, [1]), true).weave();
    },
    padLeft: function (str, length, padWith) {
        while (str.length < length) str = padWith + str;
        return str;
    },
    padRight: function (str, length, padWith) {
        while (str.length < length) str += padWith;
        return str;
    },
    capitalize: function (str, offset) {
        if (typeof offset != "number") offset = 0;
        return (offset > 0 ? str.slice(0, offset) : "") + str.charAt(offset).toUpperCase() + (offset < str.length - 1 ? str.slice(offset + 1) : "");
    },
    startsWith: function (str, substr) {
        return str.lastIndexOf(substr, 0) === 0;
    },
    endsWith: function (str, substr) {
        var nl = str.length - substr.length;
        return str.indexOf(substr, nl) === nl;
    },
    tailsMatch: function (str, startswith, endswith) {
        return this.startsWith(str, startswith) && this.endsWith(str, endswith);
    },
    tabbify: function (str, tabs) {
        return str.replace(/(^|\r?\n)/g, "$1" + "\t".repeat(tabs));
    },
    repeat: function (str, count) {
        if (count < 1) return '';
        var result = '';
        while (count > 1) {
            if (count & 1) result += str;
            count >>= 1, str += str;
        }
        return result + str;
    },
    library: require("./library.js")
};

var protos = {
    string: {
        weave: ["&", "format"],
        weaveIgnore: ["&", "formatIgnoreErrors"],
        padLeft: "&",
        padRight: "&",
        capitalize: ["&", "capitalise"],
        startsWith: "&",
        endsWith: "&",
        tailsMatch: ["&", "startsAndEndsWith"],
        tabbify: ["&", "tabify"],
        repeat: "&"
    },
    error: {
        "errors.create": "&",
        "errors.trim": "&"
    }
};
var weave = function (str, args, strict) {
    this.str = str;
    this.cursor = -1;
    this.args = args;
    this.keys = [];
    this.vals = [];
    this.segments = [];
    this.result = "";
    this.strict = !!strict;
};

var nextOccurence = function (rgx, str, offset) {
    var occurence = rgx.exec(str.slice(offset));
    return occurence && "index" in occurence ? occurence.index + occurence[0].length - 1 + offset : -1;
};

var FormatError = weaving.errors.create('FormatError', 'There was an error in your syntax, in the given string "{0}"', weave.prototype.weave);
var ArgumentError = weaving.errors.create('ArgumentError', 'There was an error using the argument identified by "{0}"', weave.prototype.weave);
var UnsupportedError = weaving.errors.create('UnsupportedError', 'Sorry, you used an currently unsupported feature: "{0}"', weave.prototype.weave);

weave.prototype = {
    weave: function () {
        this.indent = -1;
        try {
            this.extract();
            this.result = this.compile(this.str)
                .replace(/\.~\[/g, "~{")
                .replace(/\.~\]/g, "~}")
                .replace(/(~{2,})([\[\]])/g, function (match, escapes, escaped) {
                    return escapes.slice(2) + escaped;
                }).replace(/~(.)/g, "$1");
        } catch (error) {
            throw error;
        }
        return this.result;
    },
    extract: function () {
        var str = this.str
            .replace(/(~*)\[/g, "$1~~[")
            .replace(/(~*)\]/g, "$1~~]")
            .replace(/~\{/g, ".~[")
            .replace(/~\}/g, ".~]");
        var args = Array.prototype.slice.apply(arguments, [1]);
        var segments = [];
        var didSomething;
        do {
            didSomething = false;
            str = str.replace(/(^|[^~])({[^{}]*})/g, function(match, backmatch, capture) {
                didSomething = true;
                segments.push(capture);
                return backmatch + "[!" + (segments.length - 1) + "]";
            });
        } while (didSomething);
        this.str = str;
        this.segments = segments;
    },
    compile: function (str) {
        this.indent++;
        var error = new Error;
        if (weaving.tailsMatch(str, "{", "}")) {

            var matched = this.findMatch(str.slice(1, -1));
            if (!matched) throw new Error("Couldn't match the input string '" + str.slice(1, -1) + "'");

            var result = matched.segment.return.apply(this, matched.matched);

            this.indent--;
            return result;
        } else {
            var _this = this;
            var result = str.replace(/\[!(\d+)\]/g, function (match, index) {
                var result = _this.compile(_this.segments[parseInt(index)]);
                return result;
            });
            this.indent--;
            return result;
        }
        throw error;
    },
    findMatch: function (str) {
        var matchable = false, str = str, segment = "";
        this.indent++;
        for (segment in weaving.library.segments) {
            var matchers = weaving.library.segments[segment].match;
            matched = this.match(str, Array.isArray(matchers) ? matchers : [matchers]);
            if (matched !== false) break;
        }
        this.indent--;
        return matched ? { segment: weaving.library.segments[segment], matched: matched } : false;
    },
    match: function (str, matchers, sub) {
        var matched = [], offset = 0;
        for (var i = 0; i < matchers.length; i++) {
            var match = false;
            switch (typeof matchers[i]) {
                case "string": {
                    if (str.substr(offset, matchers[i].length) == matchers[i]) {
                        match = matchers[i];
                        offset += matchers[i].length;
                    } else return false;
                    break;
                }
                case "number": {
                    if (matchers[i] == 0) {
                        match = {};
                        match.keys = this.getKeys(str.slice(offset));
                        if (!match.keys) return false;
                        offset += match.keys.offset;
                        match.keys = match.keys.keys;
                        match.value = match.keys ? this.getValue(match.keys) : undefined;
                        break;
                    }
                    if (matchers[i] == 2 || matchers[i] == 1) {
                        var next = matchers.length == i + 1 ? "" : matchers[i + 1],
                            str2 = str.slice(offset),
                            nextOffset = 0,
                            optional = false;

                        if (typeof next == "object")
                            if ("optional" in next) next = next.optional, optional = true;

                        if (Array.isArray(next)) next = next[0];

                        if (typeof next == "string") {
                            nextOffset = str2.indexOf(next);
                            if ((nextOffset == -1 && optional) || matchers.length == i + 1) nextOffset = str2.length;
                            match = str2.slice(0, nextOffset);
                            if (matchers[i] == 1) match = this.compile(match);
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
                            if (typeof match == "object") offset += match.length;
                            if (Array.isArray(match.matched) && match.matched.length == 1) match.matched = match.matched[0];
                            match = [match.matched];
                        } else if ("regex" in matchers[i]) {
                            match = str.slice(offset).match("^" + matchers[i].regex);
                            if (!match) return false;
                            offset += match[0].length;
                            match = [match];
                        } else throw new Error("invalid match type");
                    }
                }
            }
            matched.push.apply(matched, Array.isArray(match) ? match : [match]);
        }
        if (!sub && offset < str.length) return false;
        return sub ? { length: offset, matched: matched } : matched;
    },
    getKeys: function (str) {
        if (!/[\.&!~a-zA-Z0-9_-]/.test(str[0])) return false;
        var keys = [], key = "", checkingLength = false;
        for (var i = 0; i < str.length && !/[?*:}]/.test(str[i]); i++) {
            if (str[i] == "~") {
                if (i++ > str.length) return false;
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
                        if (this.strict) throw new FormatError(str);
                    }
                }
                if (cont) continue;
            }
            key += str[i];
        }
        if (key.length > 0) keys.push(key);
        if (checkingLength) keys.push({checkingLength: true});
        return { keys: keys.length > 0 ? keys : false, offset: i};
    },
    escapeChar: function ( char ) {
        return char;
    },
    getValue: function (keys) {
        keys = keys.slice();
        var val = keys[0] == "&" ? this.vals : keys[0] == "!" ? this.keys : this.args;
        if (typeof keys[0] == "string") {
            if (/[&!]/.test(keys[0][0])) {
                if (keys[0].length == 1) {
                    keys[0] += "-1";
                }
                keys.unshift(keys[0][0]);
                keys[1] = keys[1].slice(1);
                if (!keys[1].match(/^0|-?[1-9]\d*$/)) return undefined;
            } else {
                var number = keys[0].match(/^0|[1-9]\d*$/);
                if (!number || number[0].length != keys[0].length) {
                    keys.unshift('0');
                }
            }
            if (keys[0].match(/[&!]/)) keys.shift();
        }
        for (var i = 0; i < keys.length; i++) {
            if (typeof keys[i] == "object" || !(keys[i] in val)) {
                if (typeof keys[i] == "object" && keys[i].checkingLength) {
                    val = Array.isArray(val) || typeof val == "string" ?(
                        val.length
                    ):(
                        typeof val == "object" ?(
                            Object.keys(val).length
                        ):(
                            (() => {
                                throw new Error("invalid value to check length of");
                            })()
                        )
                    );
                    break;
                } else if (typeof val == "object") {
                    if (keys[i].match(/-[1-9]\d*/)) keys[i] = val.length + Number(keys[i]); // if negative we're grabbing from backwards
                    else return undefined;
                    if (Math.sign(keys[i]) == -1) return undefined; // if it's still negative we subtracted too much, so error
                }
            }
            if (typeof val != "object") return undefined;
            val = val[keys[i]];
        }
        return typeof val == "string" ? val.replace(/~/g, "~~").replace(/(~+)\[/g, "$1~~[") : val;
    }
};