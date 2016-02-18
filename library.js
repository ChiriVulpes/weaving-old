var KEYS = 0, CONTENT = 1, RAWCONTENT = 2,
    OPTIONAL = function () {
        return {
            optional: Array.prototype.slice.call(arguments)
        };
    },
    REGEX = function (match) {
        if (typeof match != "string")
            throw new Error("matchable is not a string"); // TODO
        return { regex: match };
    };

var api = {
    KEYS: KEYS, CONTENT: CONTENT, RAWCONTENT: RAWCONTENT, OPTIONAL: OPTIONAL, REGEX: REGEX
};

var library = module.exports = {
    add: function (support) {
        support = support(api);
        library.segments[support.name] = support;
    },
    remove: function (name) {
        delete library.segments[name];
    },
    segments: {
        tabbification: {
            match: [ REGEX(">+"), CONTENT ],
            return: (arrows, content) => content.tabbify(arrows[0].length)
        },
        output: {
            match: KEYS,
            return: (keys) => keys.value
        },
        conditional: {
            match: [
                KEYS, "?", RAWCONTENT, OPTIONAL( ":", RAWCONTENT )
            ],
            return: function (keys, _qm, ifTrue, ifFalse) {
                return keys.value ?(
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
            return: function (keys, _a, separator, replacement) {
                var result = [], loopable = keys === undefined ? this.args : keys.value;
                var add = (function (i) {
                    this.keys.push(i);
                    this.vals.push(loopable[i]);
                    result.push(this.compile(replacement ? replacement[1] : "{&}"));
                    this.keys.pop();
                    this.vals.pop();
                }).bind(this);
                if (loopable.constructor.name == "Array") for (var i = 0; i < loopable.length; i++) add(i);
                else for (var i in loopable) add(i);
                return this.compile(result.join(separator));
            }
        }
    }
};