
Error.extend = function (name, message) {
    return function () {
        Error.captureStackTrace(this, this.constructor);
        this.name = name;
        Array.prototype.unshift.apply(arguments, [message]);
        try {
            this.message = weaving.weave.apply(weaving, arguments);
        } catch (error) {
            this.message = message;
        }
    };
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
    this.FormatError = Error.extend('FormatError', 'There was an error in your syntax, in the given string "{0}"');
    this.ArgumentError = Error.extend('ArgumentError', 'There was an error using the argument identified by "{0}"');
    this.UnsupportedError = Error.extend('UnsupportedError', 'Sorry, you used an currently unsupported feature: "{0}"');
};
weave.prototype.weave = function () {
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
var nextOccurence = function (rgx, str, offset) {
    var occurence = rgx.exec(str.slice(offset));
    return occurence && "index" in occurence ? occurence.index + occurence[0].length - 1 + offset : -1;
};
weave.prototype.compile = function (str) {
    var error = new Error;
    if (weaving.tailsMatch(str, "{", "}")) {
        var keys = this.getKeys(str.slice(1));
        var offset = keys.offset + 1;
        var value = keys.keys ? this.getValue(keys.keys) : undefined;
        if (str[offset] == "}") {
            if (this.strict && value === undefined) throw new this.ArgumentError(keys.keys ? keys.keys.join('.') : 'unknown');
            return value === undefined ? str : value;
        } else if (str[offset] == "?" || str.substr(offset, 3) == "..?") {
            if (str.substr(offset, 3) == "..?") {
                offset = offset + 2;
                if (typeof value == "object") {
                    if (value.constructor.name == "Array") {
                        value = value.length > 0;
                    } else {
                        value = Object.keys(value).length > 0;
                    }
                } else if (value === undefined && keys.keys === false) {
                    value = this.args.length;
                } else {
                    value = false;
                }
            }
            var colonOffset = nextOccurence(/(^|[^~])(~~)*:/, str, offset);
            if (value) {
                return this.compile(str.slice(offset + 1, colonOffset));
            } else {
                return colonOffset == -1 ? "" : this.compile(str.slice(colonOffset + 1, -1));
            }
        } else if (str[offset] == "*") {
            if (value === undefined && keys.offset == 0) value = this.args;
            if (typeof value == "object") {
                var colonOffset = nextOccurence(/(^|[^~])(~~)*:/, str, offset);
                var result = [];
                var _this = this;
                var add = function (i) {
                    _this.keys.push(i);
                    _this.vals.push(value[i]);
                    result.push(_this.compile(colonOffset == -1 ? "{&}" : str.slice(colonOffset + 1, -1)));
                    _this.keys.pop();
                    _this.vals.pop();
                }
                if (value.constructor.name == "Array") for (var i = 0; i < value.length; i++) add(i);
                else for (var i in value) add(i);
                return result.join(this.compile(str.slice(offset + 1, colonOffset)));
            }
        } else if (str.substr(offset, 3) == "..}") {
            offset = offset + 2;
            if (typeof value == "object") {
                if (value.constructor.name == "Array") {
                    return value.length;
                } else {
                    return Object.keys(value).length;
                }
            } else if (value === undefined && keys.keys === false) {
                return this.args.length;
            } else {
                if (this.strict) throw new this.ArgumentError(keys.keys ? keys.keys.join('.') : 'unknown');
            }
        } else {
            if (this.strict) throw new this.FormatError(str);
        }
        if (this.strict) throw new this.ArgumentError(keys.keys ? keys.keys.join('.') : 'unknown');
        return value === undefined ? str : value;
    } else {
        var _this = this;
        return str.replace(/\[!(\d+)\]/g, function (match, index) {
            var result = _this.compile(_this.segments[parseInt(index)]);
            return result;
        });
    }
    throw error;
};

weave.prototype.getKeys = function (str) {
    var keys = [];
    var key = "";
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
                if (/[?}]/.test(str[i + 2])) {
                    break;
                } else {
                    if (this.strict) throw new this.FormatError(str);
                }
            }
            if (cont) continue;
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
    keys = keys.slice();
    if (keys[0][0].match(/[&!]/)) {
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
    var val = keys[0] == "&" ? this.vals : keys[0] == "!" ? this.keys : this.args;
    if (keys[0].match(/[&!]/)) keys.shift();
    for (var i = 0; i < keys.length; i++) {
        if (typeof val != "object") return undefined;
        else if (!(keys[i] in val)) {
            if (keys[i].match(/-[1-9]\d*/)) keys[i] = val.length + Number(keys[i]);
            else return undefined;
            if (Math.sign(keys[i]) == -1) return undefined;
        }
        val = val[keys[i]];
    }
    return typeof val == "string" ? val.replace(/~/g, "~~").replace(/(~+)\[/g, "$1~~[") : val;
};

var protos = {
    weave: ["&", "format"],
    weaveIgnore: ["&", "formatIgnoreErrors"],
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
    }
};