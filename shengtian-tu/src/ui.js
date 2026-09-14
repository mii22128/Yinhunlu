/**
 * 界面：对白、升天录、黑幕、记忆印章、竹简卡、分路徽记。
 */

(() => {
const $ = (id) => document.getElementById(id);

function isCompactUi() {
  return Boolean(window.Device?.isMobile?.());
}

function bindPress(el, handler, { once = false, stop = true } = {}) {
  if (!el || typeof handler !== "function") return () => {};
  let locked = false;
  const fire = (event) => {
    if (locked) return;
    locked = true;
    if (stop) event.stopPropagation();
    if (event.cancelable && event.type !== "click") event.preventDefault();
    handler(event);
    if (once) off();
    window.setTimeout(() => {
      locked = false;
    }, 420);
  };
  const onPointer = (event) => {
    if (event.isPrimary === false) return;
    if (typeof event.button === "number" && event.button !== 0) return;
    fire(event);
  };
  const onTouch = (event) => {
    if (window.PointerEvent) return;
    fire(event);
  };
  el.addEventListener("pointerdown", onPointer);
  el.addEventListener("touchstart", onTouch, { passive: false });
  el.addEventListener("click", fire);
  function off() {
    el.removeEventListener("pointerdown", onPointer);
    el.removeEventListener("touchstart", onTouch);
    el.removeEventListener("click", fire);
  }
  return off;
}

window.bindPress = bindPress;

class GameUI {
  #recallToken = 0;
  #recallResolve = null;
  #recallTapOff = null;

  constructor() {
    this.chapter = $("chapter-title");
    this.cardCount = $("card-count");
    this.home = $("btn-home");
    this.cue = $("scroll-cue");
    this.dialogue = $("dialogue");
    this.speaker = $("speaker");
    this.text = $("dialogue-text");
    this.continue = $("btn-continue");
    this.atlas = $("atlas-modal");
    this.atlasList = $("atlas-list");
    this.atlasEmpty = $("atlas-empty");
    this.atlasMemories = $("atlas-memories");
    this.debug = $("debug-panel");
    this.veil = $("transition-veil");
    this.veilText = $("transition-text");
    this.veilContinue = $("btn-veil-continue");
    this.pathStage = $("path-stage");
    this.riteLayer = $("rite-layer");
    this.toast = $("memory-toast");
    this.memoryRow = $("memory-row");
    this.exploreDots = $("explore-dots");
    this.inkDrown = $("ink-drown");
    this.inkText = $("ink-text");
    this.inkFinale = $("ink-finale");
    this.inkContinue = $("btn-ink-continue");
    this.recall = $("recall-finale");
    this.recallCollage = $("recall-collage");
    this.recallInk = $("recall-ink");
    this.recallExhibit = $("recall-exhibit");
    this.recallSilkPaper = $("recall-silk-paper");
    this.recallSilkBlack = $("recall-silk-black");
    this.recallCopy = $("recall-copy");
    this.recallText = $("recall-text");
    this.recallHint = $("recall-hint");
    this.recallBack = $("recall-back");
  }

  setChapter(title) {
    this.chapter.textContent = title;
  }

  setHomeMode(isTitle) {
    this.home.disabled = isTitle;
    this.home.classList.toggle("is-logo", isTitle);
    document.querySelector(".game-stage")?.classList.toggle("is-title", Boolean(isTitle));
    if (isTitle) document.querySelector(".game-stage")?.classList.remove("is-paper");
  }

  showDialogue({ speaker, text, showContinue = false }) {
    this.dialogue.classList.remove("hidden");
    this.speaker.textContent = speaker;
    this.text.textContent = text;
    this.continue.classList.toggle("hidden", !showContinue);
  }

  hideDialogue() {
    this.dialogue.classList.add("hidden");
  }

  hideCue() {
    this.cue.classList.add("hidden");
  }

  setCueVisible(show) {
    this.cue.classList.toggle("hidden", !show);
  }

  showToast(title) {
    this.toast.textContent = `收录 · ${title}`;
    this.toast.classList.remove("hidden");
    this.toast.classList.add("is-on");
    clearTimeout(this.#toastTimer);
    this.#toastTimer = setTimeout(() => {
      this.toast.classList.remove("is-on");
      this.toast.classList.add("hidden");
    }, 2200);
  }

  renderExploreDots(items = []) {
    if (!this.exploreDots) return;
    this.exploreDots.replaceChildren();
    if (!items.length) {
      this.exploreDots.hidden = true;
      return;
    }
    this.exploreDots.hidden = false;
    for (const item of items) {
      const dot = document.createElement("span");
      dot.className = item.lit ? "explore-dot is-lit" : "explore-dot";
      dot.title = item.label || "未探索";
      this.exploreDots.append(dot);
    }
  }

  renderMemories() {
    this.memoryRow?.replaceChildren();
  }

  async playInkDrown({ pages = [], finale = "" } = {}) {
    if (!this.inkDrown) return;
    const stage = document.querySelector(".game-stage");
    this.hideDialogue();
    this.hidePaths();
    this.inkText.textContent = "";
    this.inkFinale.textContent = "";
    this.inkText.classList.remove("is-on");
    this.inkFinale.classList.remove("is-on");
    this.inkContinue?.classList.add("hidden");
    this.inkDrown.classList.remove("hidden", "is-spreading", "is-covered", "is-black");
    this.inkDrown.setAttribute("aria-hidden", "false");
    this.inkDrown.offsetHeight;
    stage?.classList.add("is-ink-drown");
    this.inkDrown.classList.add("is-spreading");
    await wait(2200);
    this.inkDrown.classList.add("is-covered");

    for (const page of pages) {
      this.inkText.textContent = page;
      this.inkText.classList.add("is-on");
      this.inkContinue?.classList.remove("hidden");
      await this.#waitInkContinue();
      this.inkText.classList.remove("is-on");
      this.inkContinue?.classList.add("hidden");
      await wait(280);
    }

    this.inkText.textContent = "";
    this.inkDrown.classList.add("is-black");
    if (finale) {
      this.inkFinale.textContent = finale;
      this.inkFinale.classList.add("is-on");
      await wait(1800);
    }
  }

  async playRecallFinale({ collectCard } = {}) {
    const root = this.recall;
    if (!root) return;
    const token = ++this.#recallToken;
    const alive = () => token === this.#recallToken;
    const stage = document.querySelector(".game-stage");

    this.hideDialogue();
    this.hidePaths();
    this.hideCue();

    if (this.recallSilkPaper) this.recallSilkPaper.src = "assets/bg/exhibit-t-paper.jpg?v=fei-yi1";
    if (this.recallSilkBlack) this.recallSilkBlack.src = "assets/bg/exhibit-t-black.jpg";

    this.recallCollage.replaceChildren();
    for (const frame of RECALL_FRAMES) {
      const card = document.createElement("figure");
      card.className = `recall-frame is-slot-${frame.slot}`;
      card.innerHTML = `<img alt="" src="${frame.src}" />`;
      this.recallCollage.append(card);
    }

    this.recallText.textContent = "";
    this.recallHint?.classList.remove("hidden");
    this.recallBack?.classList.add("hidden");
    root.classList.remove("hidden", "is-exhibit", "is-black", "is-done");
    this.recallInk?.classList.remove("is-spreading", "is-covered");
    this.recallExhibit?.classList.remove("is-on", "is-black");
    this.recallCollage.classList.remove("is-dissolving");
    this.recallCopy?.classList.remove("is-soft", "is-gold");
    this.recallSilkPaper?.classList.remove("is-drift");
    root.setAttribute("aria-hidden", "false");
    root.offsetHeight;
    stage?.classList.add("is-recall-finale", "is-ending");
    root.classList.add("is-on");

    const frames = [...this.recallCollage.children];
    const setCopy = (lines = []) => {
      this.recallText.textContent = lines.join("\n");
      this.recallText.classList.remove("is-in");
      this.recallText.offsetHeight;
      this.recallText.classList.add("is-in");
    };

    for (const beat of RECALL_BEATS) {
      if (!alive()) return;
      for (const index of beat.frames ?? []) frames[index]?.classList.add("is-in");

      if (beat.exhibit === "paper") {
        this.recallCollage.classList.add("is-dissolving");
        this.recallInk?.classList.add("is-spreading");
        await wait(720);
        if (!alive()) return;
        this.recallInk?.classList.add("is-covered");
        root.classList.add("is-exhibit");
        this.recallExhibit?.classList.add("is-on");
        this.recallCopy?.classList.add("is-soft");
        this.recallInk?.classList.remove("is-spreading", "is-covered");
        this.recallSilkPaper?.classList.add("is-drift");
      }

      if (beat.knowledgeCard) {
        this.recallHint?.classList.add("hidden");
        setCopy([]);
        const card = window.STT.getCard(beat.knowledgeCard);
        await this.#presentFinaleCard(card, collectCard);
        if (!alive()) return;
        this.recallHint?.classList.remove("hidden");
        continue;
      }

      if (beat.exhibit === "black") {
        root.classList.add("is-black");
        this.recallExhibit?.classList.add("is-on", "is-black");
        this.recallCopy?.classList.remove("is-soft");
        this.recallCopy?.classList.add("is-gold");
      }

      setCopy(beat.lines);

      if (beat.done) {
        root.classList.add("is-done");
        this.recallHint?.classList.add("hidden");
        this.recallBack?.classList.remove("hidden");
        await new Promise((resolve) => {
          this.#recallResolve = resolve;
          if (!this.recallBack) {
            resolve();
            return;
          }
          bindPress(this.recallBack, () => resolve(), { once: true });
        });
        return;
      }

      await wait(280);
      if (!alive()) return;
      await this.#waitRecallTap();
    }
  }

  #waitRecallTap() {
    return new Promise((resolve) => {
      const root = this.recall;
      if (!root) {
        resolve();
        return;
      }
      this.#recallTapOff?.();
      const onTap = (event) => {
        if (event.target.closest("#recall-back")) return;
        off();
        this.#recallTapOff = null;
        resolve();
      };
      const off = bindPress(root, onTap);
      this.#recallTapOff = () => {
        off();
        this.#recallTapOff = null;
        resolve();
      };
    });
  }

  #presentFinaleCard(card, collectCard) {
    return new Promise((resolve) => {
      if (!card) {
        resolve();
        return;
      }
      this.riteLayer?.classList.add("is-over-finale");
      this.showCultureSlip(
        card,
        () => {
          this.riteLayer?.classList.remove("is-over-finale");
          collectCard?.(card.id);
          resolve();
        },
        { clickToDismiss: true, hint: "再点卡片收起" },
      );
    });
  }

  clearRecallFinale({ keepToken = false } = {}) {
    if (!keepToken) this.#recallToken += 1;
    this.#recallTapOff?.();
    this.#recallTapOff = null;
    this.#recallResolve?.();
    this.#recallResolve = null;
    const stage = document.querySelector(".game-stage");
    stage?.classList.remove("is-recall-finale");
    if (!this.recall) return;
    this.recall.classList.add("hidden");
    this.recall.classList.remove("is-on", "is-exhibit", "is-black", "is-done");
    this.recall.setAttribute("aria-hidden", "true");
    this.recallCollage?.classList.remove("is-dissolving");
    this.recallCollage?.replaceChildren();
    this.recallInk?.classList.remove("is-spreading", "is-covered");
    this.recallExhibit?.classList.remove("is-on", "is-black");
    this.recallSilkPaper?.classList.remove("is-drift");
    this.recallCopy?.classList.remove("is-soft", "is-gold");
    if (this.recallText) {
      this.recallText.textContent = "";
      this.recallText.classList.remove("is-in");
    }
    this.recallBack?.classList.add("hidden");
    this.recallHint?.classList.add("hidden");
    this.riteLayer?.classList.remove("is-over-finale");
    this.clearRites();
  }

  clearInkDrown() {
    const stage = document.querySelector(".game-stage");
    stage?.classList.remove("is-ink-drown");
    if (!this.inkDrown) return;
    this.inkDrown.classList.add("hidden");
    this.inkDrown.classList.remove("is-spreading", "is-covered", "is-black");
    this.inkDrown.setAttribute("aria-hidden", "true");
    this.inkText.textContent = "";
    this.inkFinale.textContent = "";
    this.inkText.classList.remove("is-on");
    this.inkFinale.classList.remove("is-on");
    this.inkContinue?.classList.add("hidden");
  }

  #waitInkContinue() {
    return new Promise((resolve) => {
      const button = this.inkContinue;
      if (!button) {
        resolve();
        return;
      }
      bindPress(button, () => resolve(), { once: true });
    });
  }

  openAtlas({ cards, memories }) {
    const hasAny = cards.length + memories.length > 0;
    this.atlasEmpty.classList.toggle("hidden", hasAny);
    this.atlasMemories.replaceChildren();
    this.atlasList.replaceChildren();

    for (const mem of memories) {
      const chip = document.createElement("li");
      chip.className = "memory-chip";
      chip.innerHTML = `<em>${mem.seal}</em><span>${mem.title}</span><p>${mem.note}</p>`;
      this.atlasMemories.append(chip);
    }

    for (const card of cards) {
      const item = document.createElement("li");
      item.className = "slip-item";
      item.innerHTML = `<strong>${card.title}</strong><p>${card.position} · ${card.symbol}</p><p>${card.body}</p>`;
      this.atlasList.append(item);
    }

    this.atlas.classList.remove("hidden");
  }

  closeAtlas() {
    this.atlas.classList.add("hidden");
  }

  updateCardCount(n) {
    this.cardCount.textContent = String(n);
  }

  showPaths(paths, onPick, title) {
    this.pathStage.replaceChildren();
    this.pathStage.classList.remove("hidden");
    this.pathStage.classList.add("is-on");

    if (title) {
      const heading = document.createElement("p");
      heading.className = "path-title";
      heading.textContent = title;
      this.pathStage.append(heading);
    }

    for (const [index, path] of paths.entries()) {
      const side = index % 2 === 0 ? "left" : "right";
      const button = document.createElement("button");
      button.type = "button";
      button.className = `path-emblem is-${path.kind} is-choice-${side}`;
      button.innerHTML = `<span class="path-words">${path.text}</span>`;
      bindPress(button, () => onPick(path));
      this.pathStage.append(button);
    }
  }

  hidePaths() {
    this.pathStage.classList.remove("is-on");
    this.pathStage.classList.add("hidden");
    this.pathStage.replaceChildren();
  }

  clearRites() {
    this.riteLayer.classList.add("hidden");
    this.riteLayer.classList.remove("is-card");
    this.riteLayer.replaceChildren();
  }

  showCultureSlip(card, onCollect, options = {}) {
    this.riteLayer.classList.remove("hidden");
    this.riteLayer.classList.toggle("is-card", Boolean(options.clickToDismiss));
    this.riteLayer.replaceChildren();
    const slip = document.createElement("article");
    slip.className = "culture-slip";
    if (options.clickToDismiss) slip.classList.add("is-dismissible");
    const hint = options.hint || "再点卡片收起";
    slip.innerHTML = `
      <p class="culture-mark">${card.position}</p>
      <h3>${card.title}</h3>
      <p class="culture-symbol">${card.symbol}</p>
      <p class="culture-body">${card.body}</p>
      ${
        options.clickToDismiss
          ? `<p class="culture-hint">${hint}</p>`
          : `<button type="button" class="stamp-btn" data-collect>收入升天录</button>`
      }
    `;
    if (options.clickToDismiss) {
      slip.addEventListener("click", (event) => {
        event.stopPropagation();
        this.clearRites();
        onCollect?.();
      });
    } else {
      bindPress(slip.querySelector("[data-collect]"), () => onCollect());
    }
    this.riteLayer.append(slip);
  }

  async showVeil(text) {
    const pages = veilPages(text);
    if (!this.veil || !pages.length) return;
    this.veil.classList.remove("hidden");
    this.veil.setAttribute("aria-hidden", "false");
    this.veil.offsetHeight;
    this.veil.classList.add("is-on");

    if (pages.length === 1 && pages[0].length <= 36) {
      this.veilText.textContent = pages[0];
      this.veilContinue?.classList.add("hidden");
      await wait(3800);
      return;
    }

    this.veilContinue?.classList.remove("hidden");
    for (const page of pages) {
      this.veilText.textContent = page;
      await this.#waitVeilContinue();
    }
    this.veilContinue?.classList.add("hidden");
  }

  async hideVeil() {
    if (!this.veil) return;
    this.veilContinue?.classList.add("hidden");
    this.veil.classList.remove("is-on");
    await wait(700);
    this.veil.classList.add("hidden");
    this.veil.setAttribute("aria-hidden", "true");
  }

  #waitVeilContinue() {
    return new Promise((resolve) => {
      const button = this.veilContinue;
      if (!button) {
        resolve();
        return;
      }
      bindPress(button, () => resolve(), { once: true });
    });
  }

  #toastTimer = 0;
}

function veilPages(text) {
  if (Array.isArray(text)) return text.map((line) => String(line || "").trim()).filter(Boolean);
  if (typeof text === "string" && text.trim()) return [text.trim()];
  return [];
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const RECALL_FRAMES = [
  { slot: 1, src: "assets/bg/feast.jpg" },
  { slot: 2, src: "assets/bg/dragons.jpg" },
  { slot: 3, src: "assets/bg/lishi.jpg" },
  { slot: 4, src: "assets/bg/spirit.jpg" },
  { slot: 5, src: "assets/bg/gate-envoys.jpg" },
  { slot: 6, src: "assets/bg/heaven-guards.jpg" },
];

const RECALL_BEATS = [
  {
    frames: [0, 1],
    lines: ["你回想：人间的哭声与宴乐，引魂的幡帛，"],
  },
  {
    frames: [2, 3],
    lines: ["盘旋天地的双龙，幽暗世界中的神异生灵，"],
  },
  {
    frames: [4, 5],
    lines: ["守护天门的帝阍。", "这一切，竟与最初见到的那幅帛画对应。"],
  },
  {
    exhibit: "paper",
    knowledgeCard: "fei-yi",
  },
  {
    exhibit: "black",
    lines: ["天神问：“你真的抵达了天界？”", "“还是一直身在画中？”"],
  },
  {
    exhibit: "black",
    lines: ["你的旅程，重新化作帛画上的一道道路。"],
  },
  {
    exhibit: "black",
    done: true,
    lines: ["你走过的，究竟是通往天界的路，", "还是一幅画早已绘好的梦？"],
  },
];

window.GameUI = GameUI;
})();
