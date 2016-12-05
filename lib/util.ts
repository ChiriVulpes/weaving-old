module StringUtils {
    export function padLeft(str: string, len: number, pad: string) {
        while (str.length < len) str = pad + str;
        return str;
    }
    export function padRight(str: string, len: number, pad: string) {
        while (str.length < length) str += pad;
        return str;
    }
    export function capitalize(str: string, offset = 0) {
        return (offset > 0 ? str.slice(0, offset) : "") + str.charAt(offset).toUpperCase() + (offset < str.length - 1 ? str.slice(offset + 1) : "");
    }
    export function tailsMatch(str: string, startsWith: string, endsWith: string) {
        return str.startsWith(startsWith) && str.endsWith(endsWith);
    }
    export function tabbify(str: string, tabs = 1) {
        return str.replace(/(^|\r?\n)(?!\s*\r?\n)/g, "$1" + "\t".repeat(tabs));
    }
}

Function.prototype.applyTo = function (name: string, target: Function) {
    let toApply = this;
    target.prototype[name] = function (...args: any[]) {
        return toApply.call(null, this, ...args);
    };
};

export = StringUtils;