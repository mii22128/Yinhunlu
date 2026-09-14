/**
 * 场景切换、横卷、热区、幡帛飘行。
 */

(() => {
const DRAG_THRESHOLD = 36;

class SceneManager {
  #cardTimer = 0;
  #layoutToken = 0;
  #xuanwuWalkToken = 0;
  #panToken = 0;
  #sheetGuard = 0;
  #resizeObserver = null;

  constructor({ root, viewport, onHotspot, onChoose, onPan, onHome, onCue }) {
    this.root = root;
    this.viewport = viewport;
    this.onHotspot = onHotspot;
    this.onChoose = onChoose;
    this.onPan = onPan;
    this.onHome = onHome;
    this.onCue = onCue;
    this.currentId = null;
    this.currentScene = null;
    this.choicesShown = false;
    this.exploreEnabled = false;
    this.inputLocked = false;
    this.#bindPan();
    this.#bindResize();
    this.#bindKnowledgeSheet();
  }

  async show(scene, homeState) {
    const stage = document.querySelector(".game-stage");
    if (this.currentId && this.currentId !== scene.id) {
      this.root.classList.add("is-leaving");
      await wait(220);
    }

    const token = ++this.#layoutToken;
    this.hideBannerStage();
    this.closeItemCard();
    this.currentId = scene.id;
    this.currentScene = scene;
    this.choicesShown = false;
    this.exploreEnabled = false;
    this.inputLocked = false;

    const isTitle = scene.type === "title";
    const onPaper = isPaperArt(scene);
    stage?.classList.toggle("is-title", isTitle);
    stage?.classList.toggle("is-paper", onPaper);
    stage?.classList.toggle("is-ending", Boolean(scene.endingCard));

    this.root.className = `scene-root is-entering${isTitle ? " is-cover" : " is-scroll"}${onPaper ? " is-fitted" : ""}${scene.tone ? ` is-${scene.tone}` : ""}${!isTitle && !onPaper && scene.fit === "cover" ? " is-cover" : ""}`;
    this.root.style.width = "100%";
    this.root.style.backgroundImage = scene.endingCard || (!isTitle && onPaper) ? "none" : `url("${scene.bg}")`;
    this.clearXuanwuWalk();
    this.root.replaceChildren();
    this.viewport.scrollLeft = 0;

    if (isTitle) {
      this.root.append(this.#renderHome(scene, homeState));
    } else if (scene.endingCard) {
      this.root.append(this.#renderEndingCard(scene));
    } else if (onPaper) {
      await this.#mountPainting(scene);
      if (token !== this.#layoutToken) return;
      const layer = this.#layer();
      for (const hotspot of scene.hotspots ?? []) {
        if (hotspot.hidden) continue;
        layer.append(this.#renderHotspot(hotspot));
      }
    } else {
      const span = scene.span ?? 1;
      this.root.style.width = `${span * 100}%`;
      for (const hotspot of scene.hotspots ?? []) {
        if (hotspot.hidden) continue;
        this.root.append(this.#renderHotspot(hotspot));
      }
    }

    const needsNarration = (scene.type === "story" || scene.type === "ritual") && (scene.lines ?? []).length;
    this.setExploreEnabled(!needsNarration);

    requestAnimationFrame(() => {
      this.root.classList.remove("is-entering");
      this.onPan?.({ atEnd: this.isAtEnd() });
    });
  }

  #layer() {
    return this.root.querySelector(".scene-hits") || this.root.querySelector(".scene-art") || this.root;
  }

  async #mountPainting(scene) {
    const wellW = this.viewport.clientWidth || 1;
    const wellH = this.viewport.clientHeight || 1;
    const meta = await readArt(scene.bg);
    const artW = Math.round(wellH * (meta.width / meta.height));
    const slack = Math.round(wellW * 0.035);

    const stack = document.createElement("div");
    stack.className = "scene-stack";
    stack.style.width = `${artW}px`;

    const art = document.createElement("div");
    art.className = "scene-art";
    const img = document.createElement("img");
    img.className = "scene-art-img";
    img.src = scene.bg;
    img.alt = "";
    img.draggable = false;
    art.append(img);

    const hits = document.createElement("div");
    hits.className = "scene-hits";

    stack.append(art, hits);
    this.root.style.width = `${artW + slack * 2}px`;
    this.root.append(stack);
    this.#setScroll(this.#restScroll());
  }

  relayout() {
    this.#relayoutFitted();
  }

  #relayoutFitted() {
    if (!this.root.classList.contains("is-fitted")) return;
    const stack = this.root.querySelector(".scene-stack");
    const img = this.root.querySelector(".scene-art-img");
    if (!stack || !img) return;
    const wellW = this.viewport.clientWidth || 1;
    const wellH = this.viewport.clientHeight || 1;
    const width = img.naturalWidth || 16;
    const height = img.naturalHeight || 9;
    const artW = Math.round(wellH * (width / height));
    const slack = Math.round(wellW * 0.035);
    stack.style.width = `${artW}px`;
    this.root.style.width = `${artW + slack * 2}px`;
    this.#setScroll(this.#restScroll());
  }

  #bindResize() {
    if (typeof ResizeObserver !== "function") return;
    this.#resizeObserver = new ResizeObserver(() => this.#relayoutFitted());
    this.#resizeObserver.observe(this.viewport);
  }

  setNight() {
    this.root.classList.remove("is-dusk");
    this.root.classList.add("is-night");
  }

  markHotspotDone(hotspotId) {
    this.root.querySelector(`[data-hotspot="${hotspotId}"]`)?.classList.add("is-done");
  }

  isCardOpen(hotspotId) {
    const wrap = this.root.querySelector(`[data-hotspot="${hotspotId}"]`);
    return Boolean(wrap?.classList.contains("is-open") || wrap?.classList.contains("is-glow"));
  }

  openItemCard(hotspot, card) {
    const wrap = this.root.querySelector(`[data-hotspot="${hotspot.id}"]`);
    if (!wrap) return;
    this.closeItemCard();
    const title = wrap?.querySelector(".inline-title");
    const body = wrap?.querySelector(".inline-body");
    if (title) title.textContent = card.title;
    if (body) body.textContent = card.body;
    wrap?.classList.add("is-found", "is-glow");
    if (window.Device?.isMobile?.()) {
      this.#showKnowledgeSheet(card);
      wrap.classList.add("is-open");
      return wrap;
    }
    if (!wrap?.querySelector(".inline-card")) return wrap;
    this.#placeItemCard(wrap);
    clearTimeout(this.#cardTimer);
    this.#cardTimer = setTimeout(() => wrap.classList.add("is-open"), 220);
    return wrap;
  }

  closeItemCard() {
    clearTimeout(this.#cardTimer);
    this.root.querySelectorAll(".hotspot-wrap.is-glow, .hotspot-wrap.is-open, .outline-hotspot.is-glow, .outline-hotspot.is-open").forEach((node) => {
      node.classList.remove("is-glow", "is-open");
    });
    this.#hideKnowledgeSheet();
  }

  wrapOf(id) {
    return this.root.querySelector(`[data-hotspot="${id}"]`);
  }

  setExploreEnabled(enabled) {
    this.exploreEnabled = Boolean(enabled);
    this.root.classList.toggle("is-locked", !this.exploreEnabled);
  }

  setDimmed(on) {
    document.querySelector(".game-stage")?.classList.toggle("is-dim", Boolean(on));
  }

  isDimmed() {
    return Boolean(document.querySelector(".game-stage")?.classList.contains("is-dim"));
  }

  isAtEnd() {
    const max = this.root.scrollWidth - this.viewport.clientWidth;
    if (max <= 8) return true;
    return this.viewport.scrollLeft >= max - 80;
  }

  placeEndCue() {
    if (this.root.querySelector(".end-cue") || this.choicesShown) return;
    const button = document.createElement("button");
    button.type = "button";
    button.className = "end-cue";
    button.textContent = ">>>";
    button.setAttribute("aria-label", "展开选择");
    button.style.left = "94%";
    button.style.top = "46%";
    window.bindPress?.(button, () => this.onCue?.());
    this.#layer().append(button);
  }

  hideEndCue() {
    this.root.querySelector(".end-cue")?.remove();
  }

  clearXuanwuWalk() {
    this.#xuanwuWalkToken += 1;
    this.root.querySelector(".xuanwu-stage")?.remove();
    document.querySelector(".xuanwu-stage")?.remove();
  }

  startXuanwuWalk() {
    this.clearXuanwuWalk();
    const token = this.#xuanwuWalkToken;
    const stage = document.createElement("div");
    stage.className = "xuanwu-stage";
    stage.innerHTML = `
      <div class="xuanwu-actor is-walking">
        <div class="xw-bob">
          <div class="xw-layer xw-body"></div>
          <div class="xw-layer xw-leg xw-leg-a"></div>
          <div class="xw-layer xw-leg xw-leg-b"></div>
          <div class="xw-layer xw-leg xw-leg-c"></div>
          <div class="xw-layer xw-leg xw-leg-d"></div>
          <div class="xw-layer xw-zhi"></div>
        </div>
        <button type="button" class="xuanwu-zhi-hit" aria-label="灵芝" disabled></button>
      </div>
    `;
    const host = this.root.querySelector(".scene-stack") || this.root;
    host.append(stage);
    const actor = stage.querySelector(".xuanwu-actor");
    const hit = stage.querySelector(".xuanwu-zhi-hit");
    window.bindPress?.(hit, () => {
      if (hit.disabled) return;
      const hotspot = (this.currentScene?.hotspots ?? []).find((item) => item.id === "lingzhi-offer");
      if (hotspot) this.onHotspot(hotspot);
    });
    return new Promise((resolve) => {
      let settled = false;
      const done = () => {
        if (settled || token !== this.#xuanwuWalkToken) return;
        settled = true;
        actor.classList.remove("is-walking");
        actor.classList.add("is-arrived");
        resolve();
      };
      const onEnd = (event) => {
        if (event.target !== actor || event.animationName !== "xuanwu-cross") return;
        actor.removeEventListener("animationend", onEnd);
        done();
      };
      actor.addEventListener("animationend", onEnd);
      setTimeout(done, 5600);
    });
  }

  armXuanwuLingzhi() {
    const actor = this.root.querySelector(".xuanwu-actor");
    const hit = this.root.querySelector(".xuanwu-zhi-hit");
    if (!actor || !hit) return;
    actor.classList.add("is-ready");
    hit.disabled = false;
  }

  revealChoices(scene) {
    if (this.choicesShown || !scene.choices?.length) return;
    this.choicesShown = true;
    this.hideEndCue();
    this.viewport.classList.remove("is-ready");

    scene.choices.forEach((choice, index) => {
      const side = index % 2 === 0 ? "left" : "right";
      const button = document.createElement("button");
      button.type = "button";
      button.className = `scene-choice is-shown is-choice-${side}`;
      button.style.left = `${choice.x ?? 80}%`;
      button.style.top = `${choice.y ?? 50}%`;
      button.innerHTML = `<span class="choice-copy">${choice.text}${choice.hint ? `<small>${choice.hint}</small>` : ""}</span>`;
      window.bindPress?.(button, () => this.onChoose(choice));
      this.#layer().append(button);
    });

    const first = scene.choices[0];
    if (first?.x && this.root.scrollWidth > this.viewport.clientWidth) {
      const art = this.#layer();
      const artW = art.scrollWidth || this.root.scrollWidth;
      const target = (first.x / 100) * artW + (this.root.scrollWidth - artW) / 2 - this.viewport.clientWidth * 0.55;
      this.viewport.scrollTo({ left: Math.max(0, target), behavior: "smooth" });
    }
  }

  hideBannerStage() {
    const overlay = document.getElementById("banner-stage");
    const cluster = document.getElementById("banner-cluster");
    overlay?.classList.add("hidden");
    overlay?.classList.remove("is-ready");
    cluster?.classList.remove("is-grown", "is-leaving-right");
    if (cluster) {
      cluster.style.left = "";
      cluster.style.top = "";
    }
    const caption = document.getElementById("banner-line");
    if (caption) caption.textContent = "";
  }

  async presentBanner(line, { fromLeft = true } = {}) {
    const overlay = document.getElementById("banner-stage");
    const cluster = document.getElementById("banner-cluster");
    const caption = document.getElementById("banner-line");
    const stage = overlay;
    const wrap = this.root.querySelector('[data-hotspot="banner"]');
    if (!overlay || !cluster || !caption) return;

    this.inputLocked = true;
    wrap?.classList.add("is-hidden-actor");
    cluster.classList.remove("is-grown", "is-leaving-right");
    cluster.style.top = "46%";
    cluster.style.left = fromLeft ? "-12%" : "50%";
    caption.textContent = line || "";
    caption.classList.toggle("hidden", !line);
    overlay.classList.remove("hidden");
    overlay.offsetHeight;
    overlay.classList.add("is-ready");
    await wait(fromLeft ? 80 : 40);
    cluster.style.left = "50%";
    cluster.style.top = "44%";
    cluster.classList.add("is-grown");
    await wait(fromLeft ? 2400 : 600);
  }

  async followBannerAway() {
    this.inputLocked = true;
    const cluster = document.getElementById("banner-cluster");
    if (cluster) {
      cluster.style.left = "118%";
      cluster.style.top = "38%";
      cluster.classList.add("is-leaving-right");
    }
    await wait(2800);
  }

  #bindKnowledgeSheet() {
    const sheet = document.getElementById("knowledge-sheet");
    const close = sheet?.querySelector("[data-close-card]");
    if (!close) return;
    window.bindPress?.(close, () => {
      if (Date.now() - this.#sheetGuard < 480) return;
      this.closeItemCard();
    });
  }

  #showKnowledgeSheet(card) {
    const sheet = document.getElementById("knowledge-sheet");
    if (!sheet) return;
    this.#sheetGuard = Date.now();
    const title = sheet.querySelector(".inline-title");
    const body = sheet.querySelector(".inline-body");
    if (title) title.textContent = card.title;
    if (body) body.textContent = card.body;
    sheet.classList.remove("hidden");
    sheet.offsetHeight;
    sheet.classList.add("is-open");
  }

  #hideKnowledgeSheet() {
    const sheet = document.getElementById("knowledge-sheet");
    if (!sheet) return;
    sheet.classList.remove("is-open");
    sheet.classList.add("hidden");
  }

  #placeItemCard(wrap) {
    const card = wrap.querySelector(".inline-card");
    const orb = wrap.querySelector(".hotspot-orb") || wrap.querySelector(".outline-hit") || wrap;
    if (!card || !orb) return;

    card.classList.remove("card-above", "card-below", "card-left", "card-right");
    card.style.removeProperty("--card-shift");
    card.classList.add("card-below");

    const well = document.querySelector(".game-stage");
    const dialogue = document.getElementById("dialogue");
    const hud = document.querySelector(".hud");
    if (!well) return;

    const wellRect = well.getBoundingClientRect();
    const orbRect = orb.getBoundingClientRect();
    const hudBottom = hud?.getBoundingClientRect().bottom ?? wellRect.top;
    const dialogueTop =
      dialogue && !dialogue.classList.contains("hidden")
        ? dialogue.getBoundingClientRect().top
        : wellRect.bottom;

    const pad = 10;
    const topBound = Math.max(wellRect.top + pad, hudBottom + 6);
    const bottomBound = Math.min(wellRect.bottom - pad, dialogueTop - 8);
    const leftBound = wellRect.left + pad;
    const rightBound = wellRect.right - pad;
    const cardW = card.offsetWidth || 240;
    const cardH = card.offsetHeight || 180;
    const gap = 8;
    const spaceBelow = bottomBound - orbRect.bottom - gap;
    const spaceAbove = orbRect.top - topBound - gap;
    const spaceRight = rightBound - orbRect.right - gap;
    const spaceLeft = orbRect.left - leftBound - gap;
    const verticalTight = Math.max(spaceBelow, spaceAbove) < cardH * 0.86;

    let pos = "below";
    if (spaceBelow >= cardH - 6) pos = "below";
    else if (spaceAbove >= cardH - 6) pos = "above";
    else if (verticalTight && spaceRight >= cardW && spaceRight >= spaceLeft) pos = "right";
    else if (verticalTight && spaceLeft >= cardW) pos = "left";
    else {
      const scores = { below: spaceBelow, above: spaceAbove, right: spaceRight, left: spaceLeft };
      pos = Object.entries(scores).sort((a, b) => b[1] - a[1])[0][0];
    }

    card.classList.remove("card-below");
    card.classList.add(`card-${pos}`);

    if (pos === "below" || pos === "above") {
      const center = (orbRect.left + orbRect.right) / 2;
      let left = center - cardW / 2;
      let shift = 0;
      if (left < leftBound) shift = leftBound - left;
      if (left + shift + cardW > rightBound) shift = rightBound - cardW - left;
      card.style.setProperty("--card-shift", `${Math.round(shift)}px`);
    }
  }

  #renderEndingCard(scene) {
    const layer = document.createElement("div");
    layer.className = "ending-card";
    const line = scene.endingLine || `${scene.endingTitle ?? "获得结局"}：${scene.endingName ?? scene.title}`;
    layer.innerHTML = `
      <p class="ending-line">${line}</p>
      <button type="button" class="ending-back" data-ending-back>回到卷首</button>
    `;
    const back = layer.querySelector("[data-ending-back]");
    const path = (scene.paths ?? [])[0];
    window.bindPress?.(back, () => {
      if (path) this.onChoose(path);
      else this.onHome({ type: "restart" });
    });
    return layer;
  }

  #renderHome(scene, homeState = {}) {
    const unlocked = homeState.unlocked ?? new Set(["mortal"]);
    const lastSceneId = homeState.lastSceneId;
    const hasProgress = Boolean(homeState.hasProgress);
    const nodes = homeState.nodes ?? [];

    const layer = document.createElement("div");
    layer.className = "title-layer";
    const nodeHtml = nodes
      .map((node, index) => {
        const open = unlocked.has(node.id);
        const current =
          lastSceneId === node.id ||
          (node.id === "mortal" && (lastSceneId === "human_culture" || lastSceneId === "nameless")) ||
          (node.id === "dragons" &&
            (lastSceneId === "ghost_world" ||
              lastSceneId === "lingzhi" ||
              lastSceneId === "lishi" ||
              lastSceneId === "no_medicine" ||
              lastSceneId === "abyss")) ||
          (node.id === "spirit" && (lastSceneId === "jumang_listen" || lastSceneId === "jumang_wither")) ||
          (node.id === "heaven_gate" && lastSceneId === "uninvited");
        return `
          ${index ? `<span class="level-line ${open ? "is-open" : ""}"></span>` : ""}
          <button type="button" class="level-node ${open ? "is-open" : "is-locked"} ${current ? "is-current" : ""}" data-node="${node.id}" ${open ? "" : "disabled"}>
            <span class="level-mark">${node.mark}</span>
            <span>${node.label}</span>
          </button>
        `;
      })
      .join("");

    layer.innerHTML = `
      <div class="home-panel">
        <h1>${scene.heading ?? "升天图"}</h1>
        <p>${scene.subtitle ?? ""}</p>
        <div class="level-path">${nodeHtml}</div>
        <div class="home-actions">
          <button class="start-btn" type="button" data-home="restart">${hasProgress ? "从头开始" : scene.startLabel ?? "展卷"}</button>
          <button class="start-btn start-btn-ghost" type="button" data-home="continue" ${hasProgress ? "" : "disabled"}>继续上次</button>
        </div>
      </div>
    `;

    window.bindPress?.(layer.querySelector("[data-home=restart]"), () => this.onHome({ type: "restart" }));
    window.bindPress?.(layer.querySelector("[data-home=continue]"), () => {
      if (layer.querySelector("[data-home=continue]")?.disabled) return;
      this.onHome({ type: "continue" });
    });
    layer.querySelectorAll("[data-node]").forEach((button) => {
      window.bindPress?.(button, () => {
        if (!button.disabled) this.onHome({ type: "goto", sceneId: button.dataset.node });
      });
    });
    return layer;
  }

  #renderHotspot(hotspot) {
    if (hotspot.outline) return this.#renderOutline(hotspot);

    const wrap = document.createElement("div");
    wrap.className = "hotspot-wrap";
    wrap.dataset.hotspot = hotspot.id;
    wrap.style.left = `${hotspot.x}%`;
    wrap.style.top = `${hotspot.y}%`;
    if (hotspot.hint) wrap.classList.add("is-calling", "is-scattered");
    if (hotspot.station) wrap.classList.add("is-station");
    if (hotspot.faintGlow) wrap.classList.add("is-faint-glow");
    if (hotspot.biDisc) wrap.classList.add("is-bi-disc");
    if (hotspot.actor) wrap.classList.add("is-actor");
    if (hotspot.hiddenUntilSummon) wrap.classList.add("is-hidden-actor");
    if (hotspot.action?.type === "fork") wrap.classList.add("is-fork");
    const scatter = (hotspot.scatter ?? [])
      .map(
        (bit) =>
          `<img class="scatter-bit" src="${bit.icon}" alt="" style="--dx:${bit.dx}px;--dy:${bit.dy}px;--rot:${bit.rot}deg" />`,
      )
      .join("");
    const orbInner = hotspot.icon
      ? `<img src="${hotspot.icon}" alt="" />`
      : `<span class="faint-pulse" aria-hidden="true"></span>`;
    wrap.innerHTML = `
      <button type="button" class="hotspot-orb" aria-label="${hotspot.label}">
        ${orbInner}
      </button>
      ${hotspot.station ? `<span class="station-name">${hotspot.label}</span>` : ""}
      <span class="hotspot-fx" aria-hidden="true"></span>
      <span class="scatter" aria-hidden="true">${scatter}</span>
      <article class="inline-card slip-card">
        <h3 class="inline-title"></h3>
        <p class="inline-body"></p>
      </article>
    `;
    window.bindPress?.(wrap.querySelector(".hotspot-orb"), () => {
      const alwaysOpen =
        hotspot.faintGlow ||
        hotspot.station ||
        hotspot.outline ||
        hotspot.action?.type === "fork" ||
        hotspot.action?.type === "rite" ||
        hotspot.action?.type === "trace";
      if (!this.exploreEnabled && !alwaysOpen) return;
      if (wrap.dataset.hotspot !== hotspot.id) return;
      this.onHotspot(hotspot);
    });
    return wrap;
  }

  #renderOutline(hotspot) {
    const box = hotspot.outline;
    const wrap = document.createElement("div");
    wrap.className = "outline-hotspot is-bare";
    wrap.dataset.hotspot = hotspot.id;
    wrap.style.left = `${box.x}%`;
    wrap.style.top = `${box.y}%`;
    wrap.style.width = `${box.w}%`;
    wrap.style.height = `${box.h}%`;
    wrap.style.borderRadius = box.radius || "50%";
    if (hotspot.frontGlow) wrap.classList.add("is-front-glow");
    else if (hotspot.faintGlow) wrap.classList.add("is-guide");
    if (hotspot.glowTop) wrap.style.setProperty("--glow-top", hotspot.glowTop);
    wrap.innerHTML = `
      <button type="button" class="outline-hit" aria-label="${hotspot.label}"></button>
      ${hotspot.frontGlow ? `<span class="front-glow-dot" aria-hidden="true"></span>` : ""}
      <span class="outline-name">${hotspot.label}</span>
      <article class="inline-card slip-card">
        <h3 class="inline-title"></h3>
        <p class="inline-body"></p>
      </article>
    `;
    window.bindPress?.(wrap.querySelector(".outline-hit"), () => {
      const alwaysOpen =
        hotspot.action?.type === "trace" ||
        hotspot.action?.type === "rite" ||
        hotspot.action?.type === "fork";
      if (!this.exploreEnabled && !alwaysOpen) return;
      this.onHotspot(hotspot);
    });
    return wrap;
  }

  #maxScroll() {
    return Math.max(0, this.root.scrollWidth - this.viewport.clientWidth);
  }

  #restScroll() {
    return this.#maxScroll() / 2;
  }

  #setScroll(x) {
    const next = Math.min(this.#maxScroll(), Math.max(0, x));
    this.viewport.scrollLeft = next;
    return next;
  }

  #animateScroll(target) {
    const start = this.viewport.scrollLeft;
    const dest = Math.min(this.#maxScroll(), Math.max(0, target));
    const dist = dest - start;
    if (Math.abs(dist) < 0.5) {
      this.#setScroll(dest);
      return;
    }
    const token = ++this.#panToken;
    const t0 = performance.now();
    const dur = 280;
    const step = (now) => {
      if (token !== this.#panToken) return;
      const t = Math.min(1, (now - t0) / dur);
      const ease = 1 - (1 - t) ** 3;
      this.#setScroll(start + dist * ease);
      if (t < 1) requestAnimationFrame(step);
      else this.onPan?.({ atEnd: this.isAtEnd() });
    };
    requestAnimationFrame(step);
  }

  #bindPan() {
    let dragging = false;
    let tracking = false;
    let startX = 0;
    let startScroll = 0;
    let traveled = 0;
    const deadzone = 12;
    const canPan = () => !this.inputLocked && this.#maxScroll() > 4;

    this.viewport.addEventListener("pointerdown", (event) => {
      if (event.target.closest(".hotspot-wrap, .outline-hotspot, .scene-choice, .start-btn, .hud-btn, .level-node, .scroll-cue, .end-cue, .seal, .banner-cluster, .path-emblem, .rite-board, .transition-veil, .ink-drown, .recall-finale, a[download]")) {
        return;
      }
      this.closeItemCard();
      if (!canPan()) return;
      event.preventDefault();
      this.#panToken += 1;
      dragging = true;
      tracking = false;
      traveled = 0;
      startX = event.clientX;
      startScroll = this.viewport.scrollLeft;
      this.viewport.classList.add("is-dragging");
      this.viewport.setPointerCapture(event.pointerId);
    });

    this.viewport.addEventListener("pointermove", (event) => {
      if (!dragging) return;
      event.preventDefault();
      const raw = startX - event.clientX;
      traveled = Math.max(traveled, Math.abs(raw));
      if (!tracking) {
        if (Math.abs(raw) < deadzone) return;
        tracking = true;
        startX = event.clientX;
        startScroll = this.viewport.scrollLeft;
        return;
      }
      this.#setScroll(startScroll + (startX - event.clientX));
      if (traveled > DRAG_THRESHOLD) this.onPan({ dragged: true, atEnd: this.isAtEnd() });
    });

    const endDrag = () => {
      if (!dragging) return;
      if (tracking && traveled > DRAG_THRESHOLD) this.closeItemCard();
      dragging = false;
      this.viewport.classList.remove("is-dragging");
      if (this.root.classList.contains("is-fitted")) {
        this.#animateScroll(this.#restScroll());
        return;
      }
      this.onPan?.({ atEnd: this.isAtEnd() });
    };

    this.viewport.addEventListener("pointerup", endDrag);
    this.viewport.addEventListener("pointercancel", endDrag);
    this.viewport.addEventListener(
      "wheel",
      (event) => {
        if (!canPan()) return;
        event.preventDefault();
        if (this.root.classList.contains("is-fitted")) return;
        this.#setScroll(this.viewport.scrollLeft + event.deltaX + event.deltaY);
        this.onPan({ dragged: true, atEnd: this.isAtEnd() });
      },
      { passive: false },
    );
  }
}

function isPaperArt(scene) {
  return /(?:feast|dragons|spirit|xuanwu-paper|lishi|gate-envoys|heaven-guards|heaven-world|heaven-god)\.jpg$/i.test(scene?.bg ?? "");
}

const artCache = new Map();

function readArt(src) {
  if (artCache.has(src)) return artCache.get(src);
  const task = new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const width = img.naturalWidth || 1600;
      const height = img.naturalHeight || 900;
      let left = "#1a1410";
      let right = "#1a1410";
      try {
        const h = 48;
        const w = Math.max(8, Math.round(width * (h / height)));
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        ctx.drawImage(img, 0, 0, w, h);
        const strip = Math.max(1, Math.round(w * 0.04));
        left = averageStrip(ctx, 0, strip, h);
        right = averageStrip(ctx, w - strip, strip, h);
      } catch {
        /* file:// or tainted canvas: keep fallback ink */
      }
      resolve({ width, height, left, right });
    };
    img.onerror = () => resolve({ width: 1600, height: 900, left: "#1a1410", right: "#1a1410" });
    img.src = src;
  });
  artCache.set(src, task);
  return task;
}

function averageStrip(ctx, x, stripW, h) {
  const data = ctx.getImageData(x, 0, stripW, h).data;
  let r = 0;
  let g = 0;
  let b = 0;
  let n = 0;
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 16) continue;
    r += data[i];
    g += data[i + 1];
    b += data[i + 2];
    n += 1;
  }
  if (!n) return "#1a1410";
  return `rgb(${Math.round(r / n)}, ${Math.round(g / n)}, ${Math.round(b / n)})`;
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

window.SceneManager = SceneManager;
})();
