/**
 * Shared Seidr namespace (window.Seidr).
 * Methods are attached by side-effect modules; Club APIs come from bc-stubs.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type SeidrNamespace = Record<string, any>;

export const Seidr: SeidrNamespace = {};

declare global {
	interface Window {
		Seidr: SeidrNamespace;
		SeidrState: typeof import("./state").SeidrState;
		__SeidrPageLoaded?: boolean;
		__SeidrLoader?: boolean;
		__SeidrSession?: { hubs: Record<string, unknown> };
	}
}

window.Seidr = Seidr;
