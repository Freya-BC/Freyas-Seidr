// ==UserScript==
// @name         Seidr (loader)
// @namespace    https://gist.github.com/Freya-BC
// @version      1.0.68
// @description  Thin loader for Seidr — waits for login, then fetches the hosted JS bundle
// @author       Freya
// @match        https://bondageprojects.elementfx.com/*
// @match        https://www.bondageprojects.elementfx.com/*
// @match        https://bondage-europe.com/*
// @match        https://www.bondage-europe.com/*
// @match        https://bondageeurope.com/*
// @match        https://www.bondageeurope.com/*
// @match        https://bondage-asia.com/*
// @match        https://www.bondage-asia.com/*
// @match        https://bondageprojects.com/*
// @match        https://www.bondageprojects.com/*
// @run-at       document-end
// @grant        none
// ==/UserScript==

(function () {
	"use strict";
	const s = document.createElement("script");
	s.textContent = "(function(){if(window.__SeidrLoader)return;window.__SeidrLoader=true;function loggedIn(){return typeof Player!==\"undefined\"&&Player&&Player.MemberNumber!=null;}function inject(){if(window.__SeidrPageLoaded)return;var src=\"https://freya-bc.github.io/Freyas-Seidr/seidr.js?v=1.0.68\";if(!src)return;var s=document.createElement(\"script\");s.src=src;s.crossOrigin=\"anonymous\";(document.head||document.documentElement).appendChild(s);}function wait(){if(loggedIn()){inject();return;}var t=setInterval(function(){if(loggedIn()){clearInterval(t);inject();}},250);}wait();})();";
	(document.head || document.documentElement).appendChild(s);
	s.remove();
})();
