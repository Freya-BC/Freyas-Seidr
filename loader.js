/* Seidr v1.0.54 — post-login stub. FUSAM type: script. Loads the full bundle after Player.MemberNumber. */
(function () {
	"use strict";
	if (window.__SeidrLoader) return;
	window.__SeidrLoader = true;
	var selfSrc = "";
	try { selfSrc = (document.currentScript && document.currentScript.src) || ""; } catch (e) {}
	function loggedIn() {
		return typeof Player !== "undefined" && Player && Player.MemberNumber != null;
	}
	function wait(done) {
		if (loggedIn()) { done(); return; }
		var timer = setInterval(function () {
			if (loggedIn()) { clearInterval(timer); done(); }
		}, 250);
	}
	wait(function () {
		if (window.__SeidrPageLoaded) return;
		var src = selfSrc;
		if (src && /loader\.js(\?|$)/.test(src)) {
			src = src.replace(/loader\.js(\?.*)?$/, "seidr.js$1");
		}
		if (!src) return;
		if (src.indexOf("v=") < 0) src += (src.indexOf("?") >= 0 ? "&" : "?") + "v=" + "1.0.54";
		var s = document.createElement("script");
		s.src = src;
		s.crossOrigin = "anonymous";
		(document.head || document.documentElement).appendChild(s);
	});
})();
