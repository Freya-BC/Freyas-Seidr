#!/usr/bin/env python3
"""
Upload Seidr/seidr.js to a public bookmark gist.

  python3 tools/push-gist.py

Creates the gist when the bookmark id is empty, then writes that id back
into bookmark.js and src/defaults.js. Later runs PATCH the same gist.

Auth (one GitHub credential):

  1. SEIDR_GIST_TOKEN, GH_TOKEN, or GITHUB_TOKEN in the environment
  2. The same keys in .env.local (gitignored)
  3. `gh auth token` if the GitHub CLI is logged in

The gist must be public so the bookmark can fetch it without a token.
Never prints the token.
"""
from __future__ import annotations

import json
import os
import re
import subprocess
import sys
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
IIFE = ROOT / "seidr.js"
BOOKMARK = ROOT / "bookmark.js"
DEFAULTS = ROOT / "src" / "defaults.ts"
ENV_LOCAL = ROOT / ".env.local"
GIST_FILE = "seidr.js"
TOKEN_KEYS = ("SEIDR_GIST_TOKEN", "GH_TOKEN", "GITHUB_TOKEN")
GIST_ID_RE = re.compile(r'var id="([^"]*)"')
DEFAULTS_ID_RE = re.compile(r'Seidr\.BOOKMARK_GIST_ID\s*=\s*"([^"]*)"')
VERSION_RE = re.compile(r'Seidr\.VERSION\s*=\s*"(\d+\.\d+\.\d+)"')
API = "https://api.github.com"


def _fail(msg: str, code: int = 1) -> None:
	print(msg, file=sys.stderr)
	raise SystemExit(code)


def parse_env_file(path: Path) -> dict[str, str]:
	out: dict[str, str] = {}
	if not path.is_file():
		return out
	for raw in path.read_text().splitlines():
		line = raw.strip()
		if not line or line.startswith("#"):
			continue
		if line.startswith("export "):
			line = line[7:].strip()
		if "=" not in line:
			continue
		key, val = line.split("=", 1)
		key = key.strip()
		val = val.strip()
		if len(val) >= 2 and val[0] == val[-1] and val[0] in "\"'":
			val = val[1:-1]
		if key:
			out[key] = val
	return out


def token_from_mapping(data: dict[str, str]) -> str:
	for key in TOKEN_KEYS:
		val = (data.get(key) or "").strip()
		if val:
			return val
	return ""


def token_from_gh() -> str:
	try:
		proc = subprocess.run(
			["gh", "auth", "token"],
			capture_output=True,
			text=True,
			timeout=10,
			check=False,
		)
	except (FileNotFoundError, subprocess.TimeoutExpired, OSError):
		return ""
	if proc.returncode != 0:
		return ""
	return (proc.stdout or "").strip()


def resolve_token() -> str:
	token = token_from_mapping({k: os.environ.get(k, "") for k in TOKEN_KEYS})
	if token:
		return token
	token = token_from_mapping(parse_env_file(ENV_LOCAL))
	if token:
		return token
	token = token_from_gh()
	if token:
		return token
	_fail(
		"No GitHub token for gist push.\n"
		"  One-time setup (pick one):\n"
		"    • gh auth login  (grant gist scope)\n"
		"    • classic PAT with gist scope → Seidr/.env.local as SEIDR_GIST_TOKEN="
	)
	return ""


def read_version() -> str:
	m = VERSION_RE.search(IIFE.read_text())
	if not m:
		_fail(f"Could not find Seidr.VERSION in {IIFE}")
	return m.group(1)


def read_gist_id() -> str:
	if BOOKMARK.is_file():
		m = GIST_ID_RE.search(BOOKMARK.read_text())
		if m and m.group(1):
			return m.group(1)
	if DEFAULTS.is_file():
		m = DEFAULTS_ID_RE.search(DEFAULTS.read_text())
		if m:
			return m.group(1)
	return ""


def write_gist_id(gist_id: str) -> None:
	if BOOKMARK.is_file():
		text = BOOKMARK.read_text()
		if GIST_ID_RE.search(text):
			BOOKMARK.write_text(GIST_ID_RE.sub(f'var id="{gist_id}"', text, count=1))
	if DEFAULTS.is_file():
		text = DEFAULTS.read_text()
		if DEFAULTS_ID_RE.search(text):
			DEFAULTS.write_text(DEFAULTS_ID_RE.sub(f'Seidr.BOOKMARK_GIST_ID = "{gist_id}"', text, count=1))


def github(method: str, path: str, token: str, body: dict) -> dict:
	data = json.dumps(body).encode("utf-8")
	req = urllib.request.Request(
		f"{API}{path}",
		data=data,
		method=method,
		headers={
			"Accept": "application/vnd.github+json",
			"Authorization": f"Bearer {token}",
			"X-GitHub-Api-Version": "2022-11-28",
			"Content-Type": "application/json",
			"User-Agent": "Seidr-push-gist",
		},
	)
	try:
		with urllib.request.urlopen(req, timeout=120) as resp:
			return json.loads(resp.read().decode("utf-8"))
	except urllib.error.HTTPError as e:
		detail = ""
		try:
			raw = e.read().decode("utf-8", errors="replace")
			parsed = json.loads(raw)
			detail = parsed.get("message") or raw[:200]
		except Exception:
			detail = str(e.reason or e)
		_fail(f"GitHub gist {method} failed: HTTP {e.code} {detail}.")
	except urllib.error.URLError as e:
		_fail(f"GitHub gist {method} failed: {e.reason or e}")
	return {}


def push(version: str | None = None, gist_id: str | None = None, iife_path: Path | None = None) -> str:
	iife = iife_path or IIFE
	if not iife.is_file():
		_fail(f"Missing {iife.name}")
	content = iife.read_text()
	if not content.strip():
		_fail(f"{iife.name} is empty")
	ver = version or read_version()
	token = resolve_token()
	desc = f"Seidr v{ver} (bookmark IIFE)"
	payload = {
		"description": desc,
		"files": {GIST_FILE: {"content": content}},
	}
	gid = gist_id or read_gist_id()
	if gid:
		print(f"Pushing {iife.name} ({iife.stat().st_size} bytes) → gist {gid} as v{ver}")
		result = github("PATCH", f"/gists/{gid}", token, payload)
	else:
		print(f"Creating public gist for {iife.name} ({iife.stat().st_size} bytes) as v{ver}")
		payload["public"] = True
		result = github("POST", "/gists", token, payload)
		gid = result.get("id") or ""
		if not gid:
			_fail("GitHub gist create did not return an id")
		write_gist_id(gid)
		print(f"Wrote gist id into {BOOKMARK.name} and {DEFAULTS.name}")
	if result.get("public") is False:
		_fail("Gist is secret. The bookmark cannot fetch it. Recreate it as public.")
	html = result.get("html_url") or f"https://gist.github.com/{gid}"
	print(f"Pushed gist {html}")
	return html


def main() -> None:
	push()


if __name__ == "__main__":
	try:
		main()
	except KeyboardInterrupt:
		sys.exit(130)
