/** Seidr — ModSDK / BCX-safe hooks (FBM parity). */
import { Seidr } from "../seidr";

type HookFn = (args: any[], next: (a?: any[]) => any) => any;

interface FallbackEntry {
	parent: Record<string, unknown>;
	key: string;
	original: Function;
}

/** Resolve `Foo.Bar.Baz` on globalThis (ModSDK dotted paths). */
Seidr.resolveGlobalPath = function (name: string) {
	if (!name || typeof name !== "string") return undefined;
	const parts = name.split(".");
	let cur: unknown = globalThis;
	for (let i = 0; i < parts.length; i++) {
		if (cur == null || (typeof cur !== "object" && typeof cur !== "function")) return undefined;
		cur = (cur as Record<string, unknown>)[parts[i]];
	}
	return cur;
};

Seidr.registerBcModSdk = function () {
	if (Seidr.bcMod) return Seidr.bcMod;
	const sdk = (globalThis as any).bcModSdk;
	if (sdk && typeof sdk.registerMod === "function") {
		const info: {
			name: string;
			fullName: string;
			version: string;
			repository?: string;
		} = {
			name: "Seidr",
			fullName: Seidr.FULL_NAME || "Seidr",
			version: Seidr.VERSION,
		};
		if (Seidr.REPO_URL) info.repository = Seidr.REPO_URL;
		Seidr.bcMod = sdk.registerMod(info);
	}
	return Seidr.bcMod || null;
};

function trackFallback(parent: Record<string, unknown>, key: string, original: Function) {
	Seidr._fallbackHooks = Seidr._fallbackHooks || [];
	const list = Seidr._fallbackHooks as FallbackEntry[];
	list.push({ parent, key, original });
}

Seidr.restoreFallbackHooks = function () {
	const list = (Seidr._fallbackHooks || []) as FallbackEntry[];
	for (let i = list.length - 1; i >= 0; i--) {
		const entry = list[i];
		try {
			entry.parent[entry.key] = entry.original;
		} catch (e) { /* ignore */ }
	}
	Seidr._fallbackHooks = [];
};

Seidr.hookFunction = function (name: string, priority: number, hook: HookFn) {
	const sdk = Seidr.registerBcModSdk();
	if (sdk && typeof sdk.hookFunction === "function") {
		sdk.hookFunction(name, priority, hook);
		return true;
	}
	const parts = String(name || "").split(".");
	if (parts.length === 1) {
		const win = window as unknown as Record<string, unknown>;
		const original = win[name];
		if (typeof original !== "function") {
			console.warn("[Seidr] Cannot hook missing function " + name);
			return false;
		}
		trackFallback(win, name, original as Function);
		win[name] = function (...args: unknown[]) {
			return hook(args, function (nextArgs) {
				return (original as (...a: unknown[]) => unknown).apply(window, nextArgs || args);
			});
		};
		return true;
	}
	let parent: unknown = globalThis;
	for (let i = 0; i < parts.length - 1; i++) {
		if (parent == null || (typeof parent !== "object" && typeof parent !== "function")) {
			console.warn("[Seidr] Cannot hook missing path " + name);
			return false;
		}
		parent = (parent as Record<string, unknown>)[parts[i]];
	}
	const key = parts[parts.length - 1];
	if (parent == null || (typeof parent !== "object" && typeof parent !== "function")) {
		console.warn("[Seidr] Cannot hook missing path " + name);
		return false;
	}
	const obj = parent as Record<string, unknown>;
	const original = obj[key];
	if (typeof original !== "function") {
		console.warn("[Seidr] Cannot hook missing function " + name);
		return false;
	}
	console.warn("[Seidr] ModSDK missing — raw wrap of " + name + " (may trip BCX if ModSDK loads later)");
	trackFallback(obj, key, original as Function);
	obj[key] = function (this: any, ...args: unknown[]) {
		const self = this;
		return hook(args, function (nextArgs) {
			return (original as (...a: unknown[]) => unknown).apply(self, nextArgs || args);
		});
	};
	return true;
};

Seidr.tryHook = function (stateKey: string, name: string, priority: number, hook: HookFn) {
	Seidr._hookState = Seidr._hookState || {};
	if (Seidr._hookState[stateKey || name]) return true;
	const target = Seidr.resolveGlobalPath(name);
	if (typeof target !== "function") return false;
	const ok = Seidr.hookFunction(name, priority, hook);
	if (ok) Seidr._hookState[stateKey || name] = true;
	return ok;
};
