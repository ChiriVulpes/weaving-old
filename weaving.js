
var weave = function (str, args) {
    this.str = str;
    this.offset = 0;
    this.args = args;
    this.result = [];
};
weave.prototype.weave = function () {
    console.log("args:", JSON.stringify(this.args), "str:", JSON.stringify(this.str));
    while (true) {
        var last = this.offset;
        this.offset = this.getNextNotEscaped("{");
        if (this.offset == -1) break;

        if (last != this.offset) this.result.push(this.str.substring(last + 1, this.offset));

        last = this.offset;
        this.offset++;
        var keys = this.keys();

        var success = false;
        if (keys.length > 0) {
            console.log("keys:", JSON.stringify(keys.join(".")));
            var val = this.getValue(keys);
            if (this.cursor() == "}") {
                if (val !== undefined && val !== null) {
                    if (typeof val != "string") val = val.toString();
                    this.result.push(val);
                    console.log("value:", JSON.stringify(val));
                    continue;
                }
            } else if (this.cursor() == "?") {
                if (val)
            }
        }
        this.result.push(this.str.substring(last, this.offset + 1));
    }
    this.result = this.result.join("");
    console.log("result:", JSON.stringify(this.result));
    console.log((new Error).stack);
    return this.result;
};
weave.prototype.get = function () {
    return this.str.substring(this.offset);
};
weave.prototype.cursor = function () {
    return this.str[this.offset];
};
weave.prototype.consume = function (what) {
    if (typeof what == "number") this.offset += what;
    else if (typeof what == "string") this.offset += what.length;
    else if (typeof what == "object") {
        if (what instanceof RegExp) {
            var result = this.get().match(what);
            if (result === null) return false;
            else {
                this.offset += result[0].length;
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

var weaving = module.exports = {
    proto: function () {
        String.prototype.format = String.prototype.weave = function () {
            Array.prototype.unshift.apply(arguments, [this]);
            return weaving.weave.apply(null, arguments);
        };
        String.prototype.padLeft = function () {
            Array.prototype.unshift.apply(arguments, [this]);
            return weaving.padLeft.apply(null, arguments);
        };
        String.prototype.padRight = function () {
            Array.prototype.unshift.apply(arguments, [this]);
            return weaving.padRight.apply(null, arguments);
        };
    },
    weave: function (str) {
        return new weave (str, Array.prototype.slice.apply(arguments, [1])).weave();
    },
    padLeft: function (str, length, padWith) {
        while (str.length < length) str = padWith + str;
        return str;
    },
    padRight: function (str, length, padWith) {
        while (str.length < length) str += padWith;
        return str;
    }
};