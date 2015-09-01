
var weave = function (str, args, strict) {
    this.str = str;
    this.cursor = -1;
    this.args = args;
    this.segments = [];
    this.result = "";
    this.strict = !!strict;
};
weave.prototype.weave = function () {
    this.extract();
    this.result = this.compile(this.str)
        .replace(/\.~\[/g, "~{")
        .replace(/\.~\]/g, "~}")
        .replace(/(~{2,})\[/g, function (match, escapes) {
            return escapes.slice(2) + "[";
        }).replace(/~(.)/g, "$1");
    return this.result;
};
weave.prototype.extract = function () {
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
};
weave.prototype.compile = function (str) {
    if (weaving.tailsMatch(str, "{", "}")) {
        var keys = this.keys(str.slice(1));
        var offset = keys.offset + 1;
        var value = this.getValue(keys.keys);
        if (str[offset] == "}") return value === undefined ? str : value;
        else if (str[offset] == "?") {
            var colonOffset = /(^|[^~])(~~)*:/.exec(str.slice(offset));
            colonOffset = colonOffset && "index" in colonOffset ? colonOffset.index + colonOffset[0].length - 1 + offset : -1;
            if (value) {
                return this.compile(str.slice(offset + 1, colonOffset));
            } else {
                return colonOffset == "-1" ? "" : this.compile(str.slice(colonOffset + 1, -1));
            }
        } else {
            if (this.strict) throw new Error;
            else return value === undefined ? str : value;
        }
    } else {
        var _this = this;
        return str.replace(/\[!(\d+)\]/g, function (match, index) {
            var result = _this.compile(_this.segments[parseInt(index)]);
            return result;
        });
    }
};
weave.prototype.keys = function (str) {
    var keys = [];
    var key = "";
    for (var i = 0; i < str.length && !/[?*:}]/.test(str[i]); i++) {
        if (str[i] == "~") {
            if (i++ > str.length) return false;
            key += this.escapeChar(str[i]);
            continue;
        }
        if (str[i] == "." && key.length > 0) {
            keys.push(key);
            key = "";
            continue;
        }
        key += str[i];
    }
    if (key.length > 0) keys.push(key);
    return { keys: keys.length > 0 ? keys : false, offset: i};
};
weave.prototype.escapeChar = function ( char ) {
    return char;
};
weave.prototype.getValue = function (keys) {
    var number = keys[0].match(/^0|[1-9]\d*$/);
    if (!number || number[0].length != keys[0].length) {
        keys.unshift('0');
    }
    var val = this.args;
    for (var i = 0; i < keys.length; i++) {
        if (typeof val != "object" || !keys[i] in val) {
            console.log(val, keys);
            return undefined;
        }
        val = val[keys[i]];
    }
    return typeof val == "string" ? val.replace(/~/g, "~~").replace(/(~+)\[/g, "$1~~[") : val;
};

var protos = {
    weave: ["&", "format"],
    weaveStrict: ["&", "formatStrict"],
    padLeft: "&",
    padRight: "&",
    capitalize: ["&", "capitalise"],
    startsWith: "&",
    endsWith: "&",
    tailsMatch: ["&", "startsAndEndsWith"]
};

var weaving = module.exports = {
    proto: function (replace) {
        for (var fname in protos) {
            (function (fn) {
                if (replace || !(fn in String.prototype)) {
                    var keys = protos[fn];
                    if (typeof keys == "string") keys = [keys];
                    var func = function () {
                        Array.prototype.unshift.apply(arguments, [this]);
                        return weaving[fn].apply(null, arguments);
                    };
                    for (var i = 0; i < keys.length; i++) String.prototype[keys[i] == "&" ? fn : keys[i]] = func;
                }
            })(fname);
        }
    },
    weave: function (str) {
        return new weave (str, Array.prototype.slice.apply(arguments, [1])).weave();
    },
    weaveStrict: function (str) {
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
    }
};