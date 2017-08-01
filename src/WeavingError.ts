import Weaver from "./Weaver";

abstract class WeavingError {
	name: string;
	protected weavingMessage: string;
	private _stack: string;
	private _where: Function;
	protected weaver: any;
	protected proto = false;

	public get stack () {
		return this._stack.replace(/^[^\n]*(?=\n)/, this.name + ": " + this.message);
	}
	public get message () {
		this.using.unshift(this.weavingMessage);
		try {
			if (!this.weaver && !this.proto) {
				throw new Error("Weaving errors must be provided a Weaver instance, either by subclasses or the first argument on construction");
			}
			const result = this.proto ?
				(String.prototype as any).weave.apply(this.using[0], this.using.slice(1)) :
				this.weaver.weave(...this.using);
			this.using.shift();
			return result;
		} catch (error) {
			throw error;
		}
	}

	private using: any[];

	constructor(...using: any[]);
	constructor(weaver: Weaver, ...using: any[]);
	constructor(weaver: Weaver, ...using: any[]) {
		if (!this.name) this.name = this.constructor.name;

		if (weaver instanceof Weaver) {
			this.weaver = weaver;
		} else {
			using.unshift(weaver);
		}

		this.using = using;
		const result = {};
		(this as any)["prototype"] = new Error;
		const e: any = {};
		(Error as any).captureStackTrace(e, this.constructor);
		this._stack = e.stack;
	}
}
module WeavingError {
	export function trim (errorOrStack: Error | string) {
		const stack = errorOrStack instanceof Error ? errorOrStack.stack : errorOrStack;
		return stack.replace(/^[^\n]*\r?\n/, "");
	}
}

export default WeavingError;