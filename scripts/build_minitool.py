#!/usr/bin/env python3
"""Build a mini-tool zip from shengtian-tu that matches minitool-zip-builder 1.6.0."""

from __future__ import annotations

import os
import re
import shutil
import stat
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "shengtian-tu"
DIST = ROOT / "dist-minitool"
ZIP_PATH = ROOT / "minitool.zip"
ALLOWED_SUFFIX = {
    ".html",
    ".css",
    ".js",
    ".png",
    ".jpg",
    ".jpeg",
    ".gif",
    ".webp",
    ".svg",
    ".woff",
    ".woff2",
    ".json",
}


def ident_start(ch: str) -> bool:
    return ch.isalpha() or ch in "_$"


def ident_part(ch: str) -> bool:
    return ch.isalnum() or ch in "_$"


def skip_ws(src: str, i: int, step: int) -> int:
    n = len(src)
    while 0 <= i < n and src[i] in " \t\n\r":
        i += step
    return i


def skip_string_back(src: str, i: int) -> int:
    quote = src[i]
    i -= 1
    while i >= 0:
        if src[i] == quote:
            bs = 0
            j = i - 1
            while j >= 0 and src[j] == "\\":
                bs += 1
                j -= 1
            if bs % 2 == 0:
                return i
        i -= 1
    return 0


def skip_string_fwd(src: str, i: int) -> int:
    quote = src[i]
    i += 1
    n = len(src)
    while i < n:
        if src[i] == "\\":
            i += 2
            continue
        if src[i] == quote:
            return i
        i += 1
    return n - 1


def match_back(src: str, i: int, open_c: str, close_c: str) -> int:
    depth = 1
    i -= 1
    while i >= 0 and depth:
        ch = src[i]
        if ch in ("'", '"', "`"):
            i = skip_string_back(src, i)
        elif ch == close_c:
            depth += 1
        elif ch == open_c:
            depth -= 1
            if depth == 0:
                return i
        i -= 1
    return 0


def match_fwd(src: str, i: int, open_c: str, close_c: str) -> int:
    depth = 1
    i += 1
    n = len(src)
    while i < n and depth:
        ch = src[i]
        if ch in ("'", '"', "`"):
            i = skip_string_fwd(src, i)
        elif ch == open_c:
            depth += 1
        elif ch == close_c:
            depth -= 1
            if depth == 0:
                return i
        i += 1
    return n - 1


def expr_start(src: str, op_index: int) -> int:
    i = skip_ws(src, op_index - 1, -1)
    while i >= 0:
        ch = src[i]
        if ident_part(ch):
            while i >= 0 and ident_part(src[i]):
                i -= 1
            continue
        if ch == ".":
            i -= 1
            continue
        if ch == ")":
            i = match_back(src, i, "(", ")") - 1
            continue
        if ch == "]":
            i = match_back(src, i, "[", "]") - 1
            continue
        break
    return i + 1


def expr_end(src: str, start: int) -> int:
    i = skip_ws(src, start, 1)
    n = len(src)
    depth_paren = depth_brack = depth_brace = 0
    while i < n:
        ch = src[i]
        if ch in ("'", '"', "`"):
            i = skip_string_fwd(src, i) + 1
            continue
        if ch == "(":
            depth_paren += 1
        elif ch == ")":
            if depth_paren == 0 and depth_brack == 0 and depth_brace == 0:
                return i
            depth_paren -= 1
        elif ch == "[":
            depth_brack += 1
        elif ch == "]":
            if depth_paren == 0 and depth_brack == 0 and depth_brace == 0:
                return i
            depth_brack -= 1
        elif ch == "{":
            depth_brace += 1
        elif ch == "}":
            if depth_paren == 0 and depth_brack == 0 and depth_brace == 0:
                return i
            depth_brace -= 1
        elif ch in ",;:" and depth_paren == 0 and depth_brack == 0 and depth_brace == 0:
            return i
        i += 1
    return n


def consume_member_chain(src: str, j: int) -> int:
    n = len(src)
    while True:
        j = skip_ws(src, j, 1)
        if j >= n:
            return j
        if src.startswith("?.", j):
            return j
        if src[j] == ".":
            j = skip_ws(src, j + 1, 1)
            m = re.match(r"[A-Za-z_$][\w$]*", src[j:])
            if not m:
                return j
            j += len(m.group(0))
            continue
        if src[j] == "[":
            j = match_fwd(src, j, "[", "]") + 1
            continue
        if src[j] == "(":
            j = match_fwd(src, j, "(", ")") + 1
            continue
        return j


def convert_optional_chaining(src: str) -> str:
    guard = 0
    while "?." in src:
        idx = src.find("?.")
        start = expr_start(src, idx)
        obj = src[start:idx].rstrip()
        rest_start = skip_ws(src, idx + 2, 1)
        j = rest_start
        n = len(src)
        if j < n and src[j] == "(":
            j = match_fwd(src, j, "(", ")") + 1
        elif j < n and src[j] == "[":
            j = match_fwd(src, j, "[", "]") + 1
        else:
            m = re.match(r"[A-Za-z_$][\w$]*", src[j:])
            if not m:
                raise RuntimeError("optional chaining parse failed near: " + src[idx : idx + 48])
            j += len(m.group(0))
        end = consume_member_chain(src, j)
        if src[rest_start] in "([" :
            suffix = src[rest_start:end]
        else:
            suffix = "." + src[rest_start:end].strip()
        repl = "(%s==null?void 0:%s%s)" % (obj, obj, suffix)
        src = src[:start] + repl + src[end:]
        guard += 1
        if guard > 20000:
            raise RuntimeError("optional chaining loop")
    return src


def convert_nullish(src: str) -> str:
    guard = 0
    while "??" in src:
        idx = src.find("??")
        start = expr_start(src, idx)
        left = src[start:idx].rstrip()
        right_start = skip_ws(src, idx + 2, 1)
        end = expr_end(src, right_start)
        right = src[right_start:end].rstrip()
        repl = "(%s != null ? %s : %s)" % (left, left, right)
        src = src[:start] + repl + src[end:]
        guard += 1
        if guard > 20000:
            raise RuntimeError("nullish loop")
    return src


def convert_private_fields(src: str) -> str:
    src = re.sub(r"this\.#([A-Za-z_]\w*)", r"this._p_\1", src)
    src = re.sub(r"([^\w$])#([A-Za-z_]\w*)(\s*[\(=])", r"\1_p_\2\3", src)
    return src


def convert_replace_children(src: str) -> str:
    token = ".replaceChildren()"
    guard = 0
    while token in src:
        idx = src.find(token)
        start = expr_start(src, idx)
        obj = src[start:idx].rstrip()
        src = src[:start] + "clearChildren(" + obj + ")" + src[idx + len(token) :]
        guard += 1
        if guard > 20000:
            raise RuntimeError("replaceChildren loop")
    return src


def hoist_instance_fields(src: str) -> str:
    field_re = re.compile(r"^  (_p_\w+ = .+;)\n", re.M)

    def inject_constructor(chunk: str, assigns: str) -> str:
        if not assigns:
            return chunk
        if "constructor(" in chunk:
            def add_fields(match: re.Match[str]) -> str:
                return match.group(0) + assigns

            return re.sub(r"constructor\s*\([^)]*\)\s*\{", add_fields, chunk, count=1)
        return "  constructor() {\n" + assigns + "  }\n\n" + chunk

    parts = re.split(r"(class\s+\w+[^{]*\{)", src)
    out = [parts[0]]
    i = 1
    while i < len(parts):
        head = parts[i]
        body_and_rest = parts[i + 1] if i + 1 < len(parts) else ""
        depth = 1
        k = 0
        n = len(body_and_rest)
        while k < n and depth:
            ch = body_and_rest[k]
            if ch in ("'", '"', "`"):
                k = skip_string_fwd(body_and_rest, k)
            elif ch == "{":
                depth += 1
            elif ch == "}":
                depth -= 1
                if depth == 0:
                    break
            k += 1
        body = body_and_rest[:k]
        rest = body_and_rest[k:]
        fields = field_re.findall(body)
        body = field_re.sub("", body)
        assigns = "".join("    this." + field + "\n" for field in fields)
        body = inject_constructor(body, assigns)
        out.append(head + body)
        out.append(rest)
        i += 2
    return "".join(out)


def convert_js(src: str) -> str:
    src = src.replace("catch {", "catch (e) {")
    src = convert_private_fields(src)
    src = hoist_instance_fields(src)
    src = re.sub(
        r"((?:[A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)*)|\([^()]*\))\?\.replaceChildren\(\)",
        r"clearChildren(\1)",
        src,
    )
    src = convert_replace_children(src)
    src = convert_optional_chaining(src)
    src = convert_nullish(src)
    src = src.replace("willReadFrequently: true", "")
    src = re.sub(r'getContext\("2d",\s*\{\s*\}', 'getContext("2d"', src)
    src = src.replace(
        "if (typeof ResizeObserver !== \"function\") return;\n    this._p_resizeObserver = new ResizeObserver(() => this._p_relayoutFitted());\n    this._p_resizeObserver.observe(this.viewport);",
        "var relayout = () => this._p_relayoutFitted();\n    window.addEventListener(\"resize\", relayout);\n    if (typeof ResizeObserver === \"function\") {\n      this._p_resizeObserver = new ResizeObserver(relayout);\n      this._p_resizeObserver.observe(this.viewport);\n    }",
    )
    return src


def convert_css(src: str) -> str:
    def inset_repl(match: re.Match[str]) -> str:
        val = match.group(1).strip()
        return "top: %s; right: %s; bottom: %s; left: %s;" % (val, val, val, val)

    src = re.sub(r"\binset:\s*([^;]+);", inset_repl, src)

    def clamp_repl(match: re.Match[str]) -> str:
        prop, a, b, c = match.group(1), match.group(2).strip(), match.group(3).strip(), match.group(4).strip()
        fallback = a
        if re.match(r"^-?\d+(\.\d+)?(px|em|rem|vh|vw|%)$", c):
            fallback = c
        return "%s: %s; %s: clamp(%s, %s, %s);" % (prop, fallback, prop, a, b, c)

    src = re.sub(
        r"([A-Za-z-]+):\s*clamp\(([^,]+),([^,]+),([^)]+)\)",
        clamp_repl,
        src,
    )

    src = src.replace(":focus-visible", ":focus, :focus-visible")
    src = src.replace("100dvh", "100vh")
    src = src.replace("46dvh", "46vh")
    src = src.replace("32dvh", "32vh")
    src = src.replace("42dvh", "42vh")
    src = src.replace("70dvh", "70vh")
    src = src.replace("78dvh", "78vh")
    src = src.replace("80dvh", "80vh")
    src = src.replace("88dvh", "88vh")
    src = re.sub(r"\bgap:\s*", "grid-gap: ", src)
    src = src.replace("grid-gap: 10px 0;", "grid-row-gap: 10px; grid-column-gap: 0;")
    src = src.replace("grid-gap: 8px 12px;", "grid-row-gap: 8px; grid-column-gap: 12px;")
    src = src.replace("9cqh", "9vh")
    src = src.replace(
        "aspect-ratio: 796 / 351;",
        "height: 0; padding-bottom: 44.1%; aspect-ratio: 796 / 351;",
    )

    def minmax_repl(match: re.Match[str]) -> str:
        prop, func, inner = match.group(1), match.group(2), match.group(3)
        fallback = "100%"
        if prop.startswith("padding") or prop.startswith("margin"):
            fallback = "12px"
        elif prop in ("font-size", "width", "height", "min-width", "min-height", "max-width", "max-height"):
            fallback = "100%" if "width" in prop or "height" in prop else "16px"
        return "%s: %s; %s: %s(%s);" % (prop, fallback, prop, func, inner)

    src = re.sub(
        r"([A-Za-z-]+):\s*(min|max)\(([^;]+)\);",
        minmax_repl,
        src,
    )
    return src


INDEX_HTML = """<!DOCTYPE html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta
      name="viewport"
      content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover"
    />
    <title>升天图</title>
    <style>
      *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
      html, body { height: 100%; height: 100vh; height: var(--app-height, 100vh); }
      body {
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI",
                     "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif;
        -webkit-font-smoothing: antialiased;
        -webkit-tap-highlight-color: transparent;
        -webkit-user-select: none;
        -webkit-touch-callout: none;
        user-select: none;
        touch-action: manipulation;
      }
    </style>
    <link rel="stylesheet" href="./css/style.css" />
    <link rel="stylesheet" href="./ui/desktop/desktop.css" />
    <link rel="stylesheet" href="./ui/mobile/mobile.css" />
    <link rel="stylesheet" href="./css/compat.css" />
  </head>
  <body>
    <div id="app" class="game-container" data-theme="ink">
      <div class="paper-grain" aria-hidden="true"></div>
      <div class="letterbox">
        <div id="scene-frame" class="game-stage game-canvas">
          <header class="hud">
            <div class="hud-left">
              <button id="btn-home" class="seal" type="button" aria-label="返回首页">升</button>
              <div class="hud-titles">
                <p class="game-name">升天图</p>
                <p id="chapter-title" class="chapter-title">封面</p>
              </div>
            </div>
            <div class="hud-right">
              <div id="explore-dots" class="explore-dots" hidden aria-label="探索进度"></div>
              <button id="btn-atlas" class="hud-btn" type="button">
                升天录 <span id="card-count">0</span>
              </button>
            </div>
          </header>

          <div id="scene-viewport" class="scene-viewport">
            <div id="scene-root" class="scene-root"></div>
          </div>

          <div id="path-stage" class="path-stage hidden"></div>
          <div id="rite-layer" class="rite-layer hidden"></div>
          <p id="memory-toast" class="memory-toast hidden" role="status"></p>

          <div id="banner-stage" class="banner-stage hidden">
            <div id="banner-cluster" class="banner-cluster">
              <p id="banner-line" class="banner-line"></p>
              <img class="banner-flag" src="./assets/icon/banner.png" alt="" />
            </div>
            <div id="banner-choices" class="banner-choices"></div>
          </div>

          <div id="knowledge-sheet" class="knowledge-sheet hidden" aria-live="polite">
            <button type="button" class="knowledge-backdrop" data-close-card aria-label="收起知识卡片"></button>
            <article class="inline-card slip-card is-sheet">
              <h3 class="inline-title"></h3>
              <p class="inline-body"></p>
            </article>
          </div>

          <div id="recall-finale" class="recall-finale hidden" aria-hidden="true">
            <div class="recall-paper" aria-hidden="true"></div>
            <div class="recall-collage" id="recall-collage"></div>
            <div class="recall-ink" id="recall-ink" aria-hidden="true">
              <div class="ink-wash"></div>
              <div class="ink-blots">
                <i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i>
              </div>
            </div>
            <div class="recall-exhibit" id="recall-exhibit">
              <img class="recall-silk is-paper" id="recall-silk-paper" alt="" />
              <img class="recall-silk is-black" id="recall-silk-black" alt="" />
            </div>
            <div class="recall-copy" id="recall-copy">
              <p id="recall-text"></p>
              <p class="recall-hint" id="recall-hint">单击继续</p>
            </div>
            <button type="button" class="ending-back recall-back hidden" id="recall-back">回到卷首</button>
          </div>

          <div id="ink-drown" class="ink-drown hidden" aria-hidden="true">
            <div class="ink-wash"></div>
            <div class="ink-blots" aria-hidden="true">
              <i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i>
            </div>
            <div class="ink-panel">
              <p id="ink-text" class="ink-text"></p>
              <p id="ink-finale" class="ink-finale"></p>
              <button id="btn-ink-continue" class="continue-btn veil-continue hidden" type="button">续</button>
            </div>
          </div>

          <div id="transition-veil" class="transition-veil hidden" aria-hidden="true">
            <div class="transition-panel">
              <p id="transition-text" class="transition-text"></p>
              <button id="btn-veil-continue" class="continue-btn veil-continue hidden" type="button">续</button>
            </div>
          </div>

          <button id="scroll-cue" class="scroll-cue hidden" type="button" aria-label="展开选择">&gt;&gt;&gt;</button>

          <section id="dialogue" class="dialogue hidden" aria-live="polite">
            <div class="dialogue-meta">
              <span id="speaker" class="speaker"></span>
            </div>
            <p id="dialogue-text" class="dialogue-text"></p>
            <button id="btn-continue" class="continue-btn" type="button">续</button>
          </section>
        </div>
      </div>
    </div>

    <div id="atlas-modal" class="modal hidden" role="dialog" aria-modal="true">
      <div class="modal-backdrop" data-close="atlas"></div>
      <article class="atlas-panel">
        <header class="atlas-head">
          <h2>升天录</h2>
          <p id="atlas-empty" class="atlas-empty hidden">尚未收录。点画中风物，竹简与记忆自来。</p>
        </header>
        <ul id="atlas-memories" class="atlas-memories"></ul>
        <ul id="atlas-list" class="atlas-list"></ul>
        <button id="btn-close-atlas" class="stamp-btn" type="button">合册</button>
      </article>
    </div>

    <div id="rotate-prompt" class="rotate-prompt hidden" aria-hidden="true">
      <div>
        <div class="rotate-mark" aria-hidden="true">↻</div>
        <strong>请将手机横过来</strong>
        <p>横屏游玩《升天图》</p>
      </div>
    </div>

    <div id="debug-panel" class="debug-panel hidden">
      <p>调试</p>
      <select id="debug-scene"></select>
      <button id="debug-jump" type="button">跳关</button>
      <button id="debug-reset" type="button">清空重置</button>
    </div>

    <script src="./src/compat.js"></script>
    <script src="./src/data.js"></script>
    <script src="./src/device.js"></script>
    <script src="./ui/desktop/desktop.js"></script>
    <script src="./ui/mobile/mobile.js"></script>
    <script src="./src/ui.js"></script>
    <script src="./src/interaction.js"></script>
    <script src="./src/scene.js"></script>
    <script src="./src/game.js"></script>
  </body>
</html>
"""

COMPAT_JS = r"""
(function () {
  if (location.protocol === "file:") {
    document.documentElement.classList.add("is-local-file");
  }

  function clearChildren(el) {
    if (!el) return;
    while (el.firstChild) el.removeChild(el.firstChild);
  }

  function supportsFlexGap() {
    var flex = document.createElement("div");
    flex.style.position = "absolute";
    flex.style.visibility = "hidden";
    flex.style.display = "flex";
    flex.style.flexDirection = "column";
    flex.style.rowGap = "1px";
    flex.appendChild(document.createElement("div"));
    flex.appendChild(document.createElement("div"));
    document.body.appendChild(flex);
    var supported = flex.scrollHeight === 1;
    flex.parentNode.removeChild(flex);
    return supported;
  }

  window.clearChildren = clearChildren;

  function boot() {
    if (supportsFlexGap()) document.documentElement.classList.add("supports-flex-gap");
  }

  if (document.body) boot();
  else document.addEventListener("DOMContentLoaded", boot);
})();
"""

COMPAT_CSS = r"""
html, body, #app, .game-container {
  width: 100%;
  height: 100%;
  height: 100vh;
  height: var(--app-height, 100vh);
}

.game-container {
  width: 100%;
  height: 100%;
  height: 100vh;
  height: var(--vvh, var(--app-height, 100vh));
}

.game-stage,
.game-canvas {
  position: relative;
  overflow: hidden;
  width: 100%;
  height: 100%;
  width: var(--stage-w, 100%);
  height: var(--stage-h, 100%);
  background-color: #f3eee4;
  background-image: url("../assets/bg/xuan-paper.png");
  background-size: cover;
  background-position: center;
}

.scene-root {
  min-height: 100%;
  background-repeat: no-repeat;
  background-size: cover;
  background-position: center;
}

.scene-art {
  -webkit-mask-image: none;
  mask-image: none;
}

.scene-art-img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  display: block;
}

html[data-ui="desktop"] .game-stage,
html[data-ui="desktop"] .game-canvas {
  width: var(--stage-w, 100%);
  height: var(--stage-h, 100%);
}

html[data-ui="mobile"] .game-stage,
html[data-ui="mobile"] .game-canvas {
  width: 100%;
  width: var(--vvw, 100%);
  height: 100%;
  height: var(--vvh, var(--app-height, 100%));
}

.hud-left > * + *,
.hud-right > * + * {
  margin-left: 8px;
}
.home-actions > * + * {
  margin-left: 12px;
}
.explore-dots > * + * {
  margin-left: 5px;
}
.listen-row > * + *,
.rite-tray > * + *,
.rite-slots > * + * {
  margin-left: 8px;
}
.level-path > * + * {
  margin-left: 4px;
}
.debug-panel > * + * {
  margin-left: 6px;
}

.supports-flex-gap .hud-left > * + *,
.supports-flex-gap .hud-right > * + *,
.supports-flex-gap .home-actions > * + *,
.supports-flex-gap .explore-dots > * + *,
.supports-flex-gap .listen-row > * + *,
.supports-flex-gap .rite-tray > * + *,
.supports-flex-gap .rite-slots > * + *,
.supports-flex-gap .level-path > * + *,
.supports-flex-gap .debug-panel > * + * {
  margin-left: 0;
}

.custom-nav, .hud {
  padding-top: 8px;
  padding-top: var(--safe-area-inset-top, env(safe-area-inset-top, 0px));
}
"""


def copy_allowed() -> None:
    if DIST.exists():
        shutil.rmtree(DIST)
    DIST.mkdir(parents=True)
    for path in SRC.rglob("*"):
        if not path.is_file():
            continue
        if path.suffix.lower() not in ALLOWED_SUFFIX:
            continue
        if path.name in {"download.html"}:
            continue
        rel = path.relative_to(SRC)
        dest = DIST / rel
        dest.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(path, dest)


def patch_copied_js() -> None:
    for path in DIST.rglob("*.js"):
        text = path.read_text(encoding="utf-8")
        text = convert_js(text)
        if path.name == "scene.js":
            text = text.replace(
                '<a class="start-btn start-btn-ghost" href="../Yinhunlu.zip" download="升天图.zip">下载完整包</a>',
                "",
            )
        if path.name == "device.js":
            extra = """
  root.style.setProperty("--app-height", info.height + "px");
  var stageW = info.width;
  var stageH = info.height;
  if (info.ui !== "mobile") {
    stageW = Math.min(info.width, info.height * 16 / 9);
    stageH = Math.min(info.height, info.width * 9 / 16);
  }
  root.style.setProperty("--stage-w", Math.round(stageW) + "px");
  root.style.setProperty("--stage-h", Math.round(stageH) + "px");
"""
            needle = 'root.style.setProperty("--vvh", `${info.height}px`);'
            alt = 'root.style.setProperty("--vvh", info.height + "px");'
            if needle in text:
                text = text.replace(needle, needle + extra)
            elif alt in text:
                text = text.replace(alt, alt + extra)
            text = text.replace(
                'root.style.setProperty("--vvw", `${info.width}px`);',
                'root.style.setProperty("--vvw", info.width + "px");',
            )
        if path.name == "mobile.js":
            text = text.replace(
                "prompt.toggleAttribute(\"hidden\", !needRotate);",
                'if (needRotate) prompt.setAttribute("hidden", ""); else prompt.removeAttribute("hidden");',
            )
        path.write_text(text, encoding="utf-8")


def patch_copied_css() -> None:
    for path in DIST.rglob("*.css"):
        path.write_text(convert_css(path.read_text(encoding="utf-8")), encoding="utf-8")


def write_entry_files() -> None:
    (DIST / "index.html").write_text(INDEX_HTML, encoding="utf-8")
    (DIST / "src" / "compat.js").write_text(COMPAT_JS.strip() + "\n", encoding="utf-8")
    (DIST / "css" / "compat.css").write_text(COMPAT_CSS.strip() + "\n", encoding="utf-8")
    for path in DIST.rglob("*.js"):
        text = path.read_text(encoding="utf-8")
        text = re.sub(r"(['\"])assets/", r"\1./assets/", text)
        path.write_text(text, encoding="utf-8")


def assert_no_banned(text: str, name: str) -> None:
    banned = [
        r"\beval\s*\(",
        r"new Function\s*\(",
        r"\bfetch\s*\(",
        r"XMLHttpRequest",
        r"type\s*=\s*[\"']module[\"']",
        r"\bimport\s+",
        r"\bexport\s+",
        r"<iframe",
        r"download=",
        r"target=\"_blank\"",
        r"https://",
        r"http://",
    ]
    for pat in banned:
        if re.search(pat, text):
            # allow xmlns in svg/data and comments in skill-unrelated svg xml
            if pat in (r"https://", r"http://") and ("xmlns" in text or "data:image" in text):
                # still fail if real remote url in html/css/js excluding xmlns and data uri
                for m in re.finditer(r"https?://[^\s\"')]+", text):
                    url = m.group(0)
                    if "w3.org" in url or "data:image" in url:
                        continue
                    raise SystemExit("%s contains remote url: %s" % (name, url))
                continue
            if pat == r"\bimport\s+" and re.search(r"important", text):
                if not re.search(r"(^|\n)\s*import\s+", text) and "import " not in text.split("//")[0]:
                    # check real import statements
                    if not re.search(r"(?:^|\n)\s*import\s+[\w*{]", text):
                        continue
            raise SystemExit("banned pattern %s in %s" % (pat, name))


def syntax_check() -> None:
    node = shutil.which("node")
    if not node:
        print("WARN: node not found, skipped JS syntax check")
        return
    for path in sorted(DIST.rglob("*.js")):
        proc = subprocess.run([node, "--check", str(path)], capture_output=True, text=True)
        if proc.returncode != 0:
            raise SystemExit("JS syntax error in %s\n%s" % (path, proc.stderr))


def make_zip() -> None:
    if ZIP_PATH.exists():
        ZIP_PATH.unlink()
    subprocess.check_call(["zip", "-r", "-q", str(ZIP_PATH), "."], cwd=str(DIST))


def main() -> int:
    copy_allowed()
    patch_copied_js()
    patch_copied_css()
    write_entry_files()
    # second-pass: do not prefix asset paths incorrectly in comments? verify no remaining ?.
    for path in DIST.rglob("*.js"):
        text = path.read_text(encoding="utf-8")
        if "?." in text or "??" in text or "this.#" in text:
            raise SystemExit("unconverted modern syntax in %s" % path)
        if "https://" in text and "w3.org" not in text:
            raise SystemExit("remote url in %s" % path)
    html = (DIST / "index.html").read_text(encoding="utf-8")
    if "<script>" in html.replace("<script src=", ""):
        # crude: ensure no inline script without src
        if re.search(r"<script(?![^>]*src=)", html):
            raise SystemExit("inline script in index.html")
    syntax_check()
    make_zip()
    print("DIST", DIST)
    print("ZIP", ZIP_PATH, ZIP_PATH.stat().st_size)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
