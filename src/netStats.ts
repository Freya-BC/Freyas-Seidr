/**
 * Dev-only outbound traffic counter (off until reset() is called).
 * Eval in a tab: Seidr._netStats.reset() ... Seidr._netStats.snapshot()
 * Counts calls and UTF-8 bytes of the Socket.IO frame ("42" + JSON [event, data]) per event type;
 * Seidr hidden messages are split as ChatRoomChat/Hidden:Seidr:v1|v2.
 */
import { Seidr } from "./seidr";

declare const TextEncoder: any;

type Bucket = { n: number; b: number };

var seidrNetStatsOn = false;
var seidrNetStatsAt = 0;
var seidrNetStatsOut: Record<string, Bucket> = {};

function seidrUtf8Len(text: string): number {
	try {
		if (typeof TextEncoder === "function") return new TextEncoder().encode(text).length;
	} catch (e) { /* ignore */ }
	return text.length;
}

function seidrNetStatsKeys(msg: string, data: any): string[] {
	var keys = [msg];
	if (msg === "ChatRoomChat" && data && typeof data === "object") {
		var type = data.Type || "?";
		keys.push(msg + "/" + type);
		if (type === "Hidden" && data.Content === Seidr.HIDDEN) {
			var v2 = Array.isArray(data.Dictionary) && data.Dictionary[0] && data.Dictionary[0].S;
			keys.push(msg + "/Hidden:Seidr");
			keys.push(msg + "/Hidden:Seidr:" + (v2 ? "v2" : "v1"));
		}
	}
	return keys;
}

function seidrNetStatsCount(msg: string, data: any) {
	var bytes = 0;
	try {
		bytes = seidrUtf8Len("42" + JSON.stringify([msg, data === undefined ? "" : data]));
	} catch (e) { /* ignore */ }
	seidrNetStatsKeys(msg, data).forEach(function (key) {
		var bucket = seidrNetStatsOut[key] || (seidrNetStatsOut[key] = { n: 0, b: 0 });
		bucket.n++;
		bucket.b += bytes;
	});
}

Seidr._netStats = {
	reset: function () {
		seidrNetStatsOn = true;
		seidrNetStatsAt = Date.now();
		seidrNetStatsOut = {};
	},
	stop: function () { seidrNetStatsOn = false; },
	snapshot: function () {
		return { on: seidrNetStatsOn, ms: Date.now() - seidrNetStatsAt, out: JSON.parse(JSON.stringify(seidrNetStatsOut)) };
	},
};

Seidr.installNetStats = function () {
	Seidr.tryHook("NetStats:ServerSend", "ServerSend", 1, function (args, next) {
		if (seidrNetStatsOn) {
			try { seidrNetStatsCount(String(args[0]), args[1]); } catch (e) { /* ignore */ }
		}
		return next(args);
	});
};
