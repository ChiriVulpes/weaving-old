
var weave = function (str, args, strict) {
    this.str = str;
    this.cursor = -1;
    this.args = args;
    this.result = [];
    this.strict = !!strict;
};
weave.prototype.weave = function () {
    console.log("args:", JSON.stringify(this.args), "str:", JSON.stringify(this.str));
    while (true) {
        var last = this.cursor;
        this.cursor = this.getNextNotEscaped("{");
        if (this.cursor == -1) {
            this.result.push(this.str.substring(last + 1));
            break;
        }

        if (last != this.cursor) this.result.push(this.str.substring(last + 1, this.cursor));

        last = this.cursor;
        this.cursor++;
        var keys = this.keys();

        var success = false;
        if (keys.length > 0) {
            var val = this.getValue(keys), hasVal = (val !== undefined && val !== null);
            if (!this.isEscapedAt(this.cursor)) {
                if (this.getChar() == "}") {
                    if (hasVal) {
                        if (typeof val != "string") val = val.toString();
                        this.result.push(val);
                        continue;
                    } else if (this.strict) throw new Error("Argument does not exist by keys " + JSON.stringify(keys.join(".")) + "");
                } else if (this.getChar() == "?") {

                    if (hasVal) {

                    } else {

                    }
                }
            }
        }
        this.result.push(this.str.substring(last, this.cursor + 1));
    }
    this.result = this.result.join("");
    return this.result;
};
weave.prototype.getNextNotEscaped = function (what, offset) {
    if (typeof offset != "number") offset = this.cursor;
    while (true) {
        offset = this.str.indexOf(what, offset);
        if (offset == -1) return offset;
        if (!this.isEscapedAt(offset)) return offset;
    }
};
weave.prototype.nextUnusedClosingBracket = function (offset) {
    if (typeof offset != "number") offset = this.cursor;
    var opening = offset, closing = offset, opened = 0;
    while (true) {
        closing = getNextNotEscaped("}", closing);
        if (opening != -1) {
            opening = getNextNotEscaped("{", opening);
            if (opening != -1) opened++;
        }
        if (opening == -1 || opening > closing) return closing;
    }
};
weave.prototype.isEscapedAt = function (offset) {
    var i = offset - 1, count = 0;
    while (i-- > -1 && this.str[i] == "\\") count++;
    return count % 2 != 0;
};
weave.prototype.get = function () {
    return this.str.substring(this.cursor);
};
weave.prototype.getChar = function () {
    return this.str[this.cursor];
};
weave.prototype.consume = function (what) {
    if (typeof what == "number") this.cursor += what;
    else if (typeof what == "string") this.cursor += what.length;
    else if (typeof what == "object") {
        if (what instanceof RegExp) {
            var result = this.get().match(what);
            if (result === null) return false;
            else {
                this.cursor += result[0].length;
                return result;
            }
        }
    }
    return true;
};
weave.prototype.keys = function () {
    var str = this.get();
    var keys = [];
    var key = "";
    for (var i = 0; i < str.length && !/[?*:}]/.test(str[i]); i++) {
        if (str[i] == "\\") {
            if (i++ > str.length) return false;
            key += this.escapeChar(str[i]);
            continue;
        }
        if (str[i] == "." && key.length > 0) {
            keys.push(key);
            continue;
        }
        key += str[i];
    }
    if (key.length > 0) keys.push(key);
    this.consume(i);
    return keys.length > 0 ? keys : false;
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
            return undefined;
        }
        val = val[keys[i]];
    }
    return val;
};

var call = function (what, who, args) {
    Array.prototype.unshift.apply(args, [who]);
    return what.apply(null, args);
};

var weaving = module.exports = {
    proto: function () {
        String.prototype.format = String.prototype.weave = function () {
            return call(weaving.weave, this, arguments);
        };
        String.prototype.formatStrict = String.prototype.weaveStrict = function () {
            return call(weaving.weaveStrict, this, arguments);
        };
        String.prototype.padLeft = function () {
            return call(weaving.padLeft, this, arguments);
        };
        String.prototype.padRight = function () {
            return call(weaving.padRight, this, arguments);
        };
        String.prototype.capitalize = function () {
            return call(weaving.capitalize, this, arguments);
        };
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
    }
};

weaving.proto();

console.log("{0}!".weaveStrict("Hello, world!"));

var greetings = ["hi", "hello", "hey", "wazzup"];
var things = ["Bob", "world", "Yuudachi", "banana boy"];

for (var i = 0; i < greetings.length; i++) {
    console.log("{greeting}, {what}!".weaveStrict({greeting: greetings[i].capitalize(), what: things[i]}));
}