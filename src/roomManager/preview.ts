/** Local-only background preview thumbnails */
const PREFIX = "SeidrRmPreview_";
const MAX_EDGE = 280;

function hashUrl(url: string): string {
	let h = 0;
	for (let i = 0; i < url.length; i++) h = ((h << 5) - h + url.charCodeAt(i)) | 0;
	return String(h >>> 0);
}

export function rmPreviewKey(url: string): string {
	return PREFIX + hashUrl(url);
}

export function rmGetCachedPreview(url: string): string | null {
	try {
		return localStorage.getItem(rmPreviewKey(url));
	} catch (e) {
		return null;
	}
}

export function rmCachePreview(url: string, dataUrl: string) {
	try {
		localStorage.setItem(rmPreviewKey(url), dataUrl);
	} catch (e) {
		/* quota — ignore */
	}
}

/** Load image, draw resized thumb, cache. Resolves data URL or null. */
export function rmEnsurePreview(url: string): Promise<string | null> {
	const cached = rmGetCachedPreview(url);
	if (cached) return Promise.resolve(cached);
	return new Promise(function (resolve) {
		const img = new Image();
		img.crossOrigin = "anonymous";
		img.referrerPolicy = "no-referrer";
		img.onload = function () {
			try {
				const w = img.naturalWidth || img.width;
				const h = img.naturalHeight || img.height;
				if (!w || !h) { resolve(null); return; }
				const scale = Math.min(1, MAX_EDGE / Math.max(w, h));
				const cw = Math.max(1, Math.round(w * scale));
				const ch = Math.max(1, Math.round(h * scale));
				const canvas = document.createElement("canvas");
				canvas.width = cw;
				canvas.height = ch;
				const ctx = canvas.getContext("2d");
				if (!ctx) { resolve(null); return; }
				ctx.drawImage(img, 0, 0, cw, ch);
				const dataUrl = canvas.toDataURL("image/jpeg", 0.72);
				rmCachePreview(url, dataUrl);
				resolve(dataUrl);
			} catch (e) {
				// CORS tainted canvas — fall back to raw URL for display
				resolve(url);
			}
		};
		img.onerror = function () { resolve(null); };
		img.src = url;
	});
}
