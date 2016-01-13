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
    }
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

var FormatError = weaving.errors.create('FormatError', 'There was an error in your syntax, in the given string "{0}"', weave.prototype.weave);
var ArgumentError = weaving.errors.create('ArgumentError', 'There was an error using the argument identified by "{0}"', weave.prototype.weave);
var UnsupportedError = weaving.errors.create('UnsupportedError', 'Sorry, you used an currently unsupported feature: "{0}"', weave.prototype.weave);

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
        if (str[1] == ">") {
            var i = 1;
            while (str[i] == ">") i++;
            return this.compile(str.slice(i, -1)).tabbify(i - 1);
        }
        var keys = this.getKeys(str.slice(1));
        var offset = keys.offset + 1;
        var value = keys.keys ? this.getValue(keys.keys) : undefined;
        if (str[offset] == "}") {
            if (this.strict && value === undefined) throw new ArgumentError(keys.keys ? keys.keys.join('.') : 'unknown');
            return value === undefined ? str : value;
        } else if (str[offset] == "?" || str.substr(offset, 3) == "..?") {
            if (str.substr(offset, 3) == "..?") {
                offset = offset + 2;
                if (typeof value == "number") value = String(value);
                if (typeof value == "object") {
                    if (value.constructor.name == "Array") {
                        value = value.length > 0;
                    } else {
                        value = Object.keys(value).length > 0;
                    }
                } else if (typeof value == "string") {
                    value = value.length > 0;
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
            } else if (typeof value == "string") {
                return value.length;
            } else if (value === undefined && keys.keys === false) {
                return this.args.length;
            } else {
                if (this.strict) throw new ArgumentError(keys.keys ? keys.keys.join('.') : 'unknown');
            }
        } else {
            if (this.strict) throw new FormatError(str);
        }
        if (this.strict) throw new ArgumentError(keys.keys ? keys.keys.join('.') : 'unknown');
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
                    if (this.strict) throw new FormatError(str);
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