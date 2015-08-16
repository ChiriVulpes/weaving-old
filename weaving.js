var weaving = module.exports = {
    proto: function () {
        String.prototype.format = function () {
            Array.prototype.unshift.apply(arguments, [this]);
            return weaving.format.apply(null, arguments);
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
    format: function (str) {
        var args = Array.prototype.slice.apply(arguments, [1]), didSomething;
        do {
            didSomething = false;
            str = str.replace(/(^|[^\\]){(\d+(?:\?[^{}]*[^\\])?)}/g, function(match, backmatch, capture) {
                var result;
                var number = capture.match(/^\d+/)[0];
                if (capture.length == number.length) {
                    result = (typeof args[number] != 'undefined')? ("" + args[number]).replace(/(?=[:{}])/g, "\\") : match;
                } else {
                    var str = capture.substring(number.length + 1).match(/(.+?[^\\](?::|$))/g);
                    for (var i = 0; i < str.length - 1; i++) str[i] = str[i].substring(0, str[i].length - 1);
                    result = args[number] ? str[0] : (str.length > 1 ? str[1] : match);
                }
                if (result != match) {
                    didSomething = true;
                    return backmatch + result;
                }
                return result;
            });
        } while (didSomething);
        return str.replace(/\\([:{}])/g, "$1");
    },
    padLeft: function (str, length, padWith) {
        return (padWith + str).slice(-length);
    },
    padRight: function (str, length, padWith) {
        return (padWith + str).slice(length);
    }
};