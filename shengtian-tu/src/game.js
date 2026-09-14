/**
 * 游戏状态：人间双线、记忆碎片、切关。
 */

(() => {
const {
  GAME_META,
  LEVEL_NODES,
  SCENE_ORDER,
  getCard,
  getMemory,
  getScene,
  hasCompleteHumanMemory,
  resolveScene,
} = window.STT;
const InteractionDirector = window.InteractionDirector;
const SceneManager = window.SceneManager;
const GameUI = window.GameUI;

const $ = (id) => document.getElementById(id);
const SAVE_KEY = "shengtian-tu-save";

class Game {
  #choosing = false;
  #pathsShown = false;
  #riteIndex = 0;
  #nightReady = false;
  #nightContinue = null;
  #summoning = false;
  #cultureCardOpen = false;
  #xuanwuArrived = false;
  #forkTimer = 0;
  #faintTimer = 0;
  #recallTimer = 0;
  #recallGen = 0;
  #recallStarted = false;
  #bannerCallActive = false;
  #bannerCallIndex = 0;

  constructor() {
    this.state = loadState();
    this.lineIndex = 0;
    this.sceneFlow = { atEnd: false };
    this.debug = new URLSearchParams(location.search).has("debug");
    this.activeScene = null;

    this.ui = new GameUI();
    this.fx = new InteractionDirector({ riteLayer: this.ui.riteLayer });
    this.scenes = new SceneManager({
      root: $("scene-root"),
      viewport: $("scene-viewport"),
      onHotspot: (hotspot) => this.handleHotspot(hotspot),
      onChoose: (choice) => this.choose(choice),
      onPan: (info) => this.handlePan(info),
      onHome: (action) => this.handleHome(action),
      onCue: () => this.#openChoices(),
    });

    this.#bindUi();
    this.#bindViewport();
    this.#setupDebug();
    this.#refreshHud();
  }

  async start() {
    await this.goTo(GAME_META.startScene);
  }

  async goTo(sceneId, { reset = false, skipVeil = false, veilOverride } = {}) {
    if (reset) {
      this.state = createState();
      saveState(this.state);
    }

    const prevId = this.state.sceneId;
    const scene = resolveScene(getScene(sceneId), this.state);
    const veilText = veilOverride || scene.transitionIn;
    const playVeil = !skipVeil && hasVeilCopy(veilText) && prevId && prevId !== scene.id;

    this.#recallGen += 1;
    this.#recallStarted = false;
    clearTimeout(this.#recallTimer);
    this.#recallTimer = 0;
    this.ui.clearRecallFinale();
    this.ui.hidePaths();
    this.ui.clearRites();
    this.fx.stopAmbient();

    if (playVeil) {
      this.ui.hideDialogue();
      await this.ui.showVeil(veilText);
    }

    this.state.sceneId = scene.id;
    this.state.visited.add(scene.id);
    if (scene.type !== "title") {
      this.state.lastSceneId = scene.id;
      this.state.unlocked.add(unlockNodeFor(scene.id, scene));
    }
    if (scene.grantMemory) {
      this.state.memories.add(scene.grantMemory);
    }

    this.activeScene = scene;
    this.lineIndex = 0;
    this.sceneFlow = { atEnd: false };
    this.#choosing = false;
    this.#pathsShown = false;
    clearTimeout(this.#forkTimer);
    this.#forkTimer = 0;
    clearTimeout(this.#faintTimer);
    this.#faintTimer = 0;
    this.#riteIndex = 0;
    this.#nightReady = false;
    this.#summoning = false;
    this.#cultureCardOpen = false;
    this.#xuanwuArrived = false;
    this.#bannerCallActive = false;
    this.#bannerCallIndex = 0;
    if (this.#nightContinue) {
      this.ui.continue.removeEventListener("click", this.#nightContinue);
      this.#nightContinue = null;
    }
    saveState(this.state);

    await this.scenes.show(scene, this.#homeView());
    if (scene.xuanwuWalk) {
      this.scenes.startXuanwuWalk().then(() => {
        if (this.state.sceneId !== scene.id) return;
        this.#xuanwuArrived = true;
        this.scenes.armXuanwuLingzhi();
        this.scenes.setExploreEnabled(true);
      });
    }
    this.ui.setChapter(scene.title);
    this.ui.setHomeMode(scene.type === "title");
    this.ui.hideCue();
    const shouldDim = this.#shouldDimOnEnter(scene);
    this.scenes.setDimmed(shouldDim);
    if (scene.type === "ritual" && !shouldDim) this.scenes.setExploreEnabled(true);
    this.#syncTraced(scene);
    this.renderDialogue(scene);
    this.#syncScrollCue();
    this.#syncDebugScene();
    this.#refreshHud();

    if (scene.grantMemory) {
      const mem = getMemory(scene.grantMemory);
      if (mem) this.ui.showToast(mem.title);
    }

    if (playVeil) await this.ui.hideVeil();
  }

  #queueRecallFinale() {
    if (this.#recallStarted) return;
    this.#recallStarted = true;
    const gen = this.#recallGen;
    window.setTimeout(async () => {
      if (gen !== this.#recallGen) return;
      const stage = document.querySelector(".game-stage");
      stage?.classList.add("is-ending");
      await this.ui.playRecallFinale({
        collectCard: (id) => {
          if (!id || this.state.collected.has(id)) return;
          this.state.collected.add(id);
          saveState(this.state);
          this.#refreshHud();
        },
      });
      if (gen !== this.#recallGen) return;
      this.goTo("title");
    }, 0);
  }

  handleHome(action) {
    if (action.type === "restart") {
      this.goTo("mortal", { reset: true });
      return;
    }
    if (action.type === "continue") {
      this.goTo(this.state.lastSceneId || "mortal");
      return;
    }
    if (action.type === "goto" && this.state.unlocked.has(action.sceneId)) {
      this.goTo(action.sceneId);
    }
  }

  renderDialogue(scene) {
    const lines = Array.isArray(scene.lines) ? scene.lines : [];

    if (scene.type === "ending") {
      if (scene.endingCard) {
        this.ui.hideDialogue();
        this.ui.hidePaths();
        return;
      }
      this.ui.showDialogue({ speaker: "旁白", text: this.#endingText(scene) });
      if (scene.paths?.length) {
        this.#offerFork(scene, { delay: 500 });
      } else {
        this.scenes.revealChoices(scene);
      }
      return;
    }

    if (!lines.length) {
      this.ui.hideDialogue();
      return;
    }

    const line = lines[Math.min(this.lineIndex, lines.length - 1)];
    const done = this.lineIndex >= lines.length - 1;
    const awaitingBrighten = done && this.scenes.isDimmed();
    this.ui.showDialogue({
      speaker: line.speaker,
      text: line.text,
      showContinue: !done || awaitingBrighten || Boolean(scene.recallFinale) || Boolean(scene.clickNext),
    });
    if (awaitingBrighten) {
      this.scenes.setExploreEnabled(false);
      return;
    }
    this.scenes.setExploreEnabled(
      scene.recallFinale || scene.clickNext ? false : scene.type === "ritual" ? true : done,
    );

    if (done && scene.recallFinale) {
      this.ui.hideCue();
      return;
    }

    if (done && scene.pan && scene.choices?.length && !scene.paths && !scene.hideEndCue) {
      this.scenes.placeEndCue();
      this.ui.text.textContent = `${line.text} 向右拖开画卷，尽头可见去路。`;
    }
    if (done && scene.paths && scene.id === "mortal") {
      if (this.#mortalItemsReady(scene)) {
        if (this.state.flags.has("mortal:fork")) {
          this.#summonMortalBanner({ resume: true });
        } else if (this.state.flags.has("mortal:culture-dismissed")) {
          this.#startMortalBannerCall({ resume: true });
        } else {
          this.#showMortalCultureCard({ resume: true });
        }
      }
    }
    if (done && scene.id === "dragons") {
      this.ui.text.textContent = line.text;
    }
    if (done && scene.id === "spirit") {
      this.ui.text.textContent = `${line.text} 点画里发亮的人面鸟。`;
    }
    if (done && scene.id === "gate") {
      this.ui.text.textContent = `${line.text} 点画中发亮的使者。`;
    }
    if (done && scene.id === "heaven_gate") {
      this.ui.text.textContent = `${line.text} 点门前发亮的守卫。`;
    }
    if (done && scene.id === "lishi") {
      this.ui.text.textContent = `${line.text}`;
    }
    if (done && scene.xuanwuWalk) {
      this.ui.text.textContent = `${line.text}`;
      if (this.#xuanwuArrived) this.scenes.armXuanwuLingzhi();
    }
    if (done && scene.autoFork && scene.paths?.length) {
      this.#offerFork(scene, { delay: 420 });
    }
    if (done && scene.type === "ritual") {
      this.ui.text.textContent = `${line.text} 点席上的酒食，把它们叫出名字，再去听乐。`;
      this.scenes.setExploreEnabled(true);
      this.#maybeShowCulture(scene);
    }
    if (done && scene.autoKnowledge) {
      const hotspot = (scene.hotspots ?? []).find((item) => item.id === scene.autoKnowledge);
      if (hotspot && !this.state.collected.has(hotspot.action?.cardId)) {
        this.#collect(hotspot);
        return;
      }
    }
    if (done && scene.afterCollect && this.state.collected.has(scene.afterCollect.cardId)) {
      if (scene.afterCollect.autoFaint) this.#scheduleFaint(scene.afterCollect);
      else this.#offerFork(scene.afterCollect, { delay: 480 });
    }
    if (done && scene.autoReturn) {
      this.#scheduleReturn(scene.autoReturn);
    }
    if (done && scene.autoNext) {
      this.#offerFork(
        {
          forkTitle: scene.autoTitle,
          paths: [
            {
              id: "auto-next",
              kind: scene.autoKind || "refuse",
              text: scene.autoLabel || "继续",
              next: scene.autoNext,
              flag: scene.autoFlag,
            },
          ],
        },
        { delay: 700 },
      );
    }
    if (done) this.#syncScrollCue();
  }

  async choose(choice) {
    if (this.#choosing || (!choice?.next && !choice.stay)) return;
    this.#choosing = true;

    try {
      if (choice.flag) this.state.flags.add(choice.flag);
      for (const flag of choice.unsetFlags ?? []) this.state.flags.delete(flag);
      if (choice.incomplete) {
        this.state.flags.add("memory:incomplete");
        this.state.flags.delete("memory:complete");
      }
      if (choice.flag === "memory:complete") {
        this.state.flags.delete("memory:incomplete");
      }

      this.ui.hidePaths();
      this.#pathsShown = false;

      if (choice.stay) {
        this.ui.showDialogue({
          speaker: choice.staySpeaker || "旁白",
          text: choice.stayText || "",
        });
        this.#offerFork(
          { paths: choice.thenPaths, forkTitle: choice.thenTitle },
          { delay: choice.delay ?? 520 },
        );
        return;
      }

      if (choice.inkDrown) {
        this.scenes.setExploreEnabled(false);
        this.scenes.inputLocked = true;
        this.ui.hideDialogue();
        if (choice.next && choice.next !== "title") {
          this.state.unlocked.add(unlockNodeFor(choice.next));
        }
        saveState(this.state);
        await this.ui.playInkDrown({
          pages: choice.inkPages ?? [],
          finale: choice.inkFinale || "获得结局：无名游魂",
        });
        await this.goTo(choice.next, { skipVeil: true });
        this.ui.clearInkDrown();
        return;
      }

      if (choice.grantMemory) {
        this.state.memories.add(choice.grantMemory);
        const mem = getMemory(choice.grantMemory);
        if (mem) this.ui.showToast(mem.title);
        this.#refreshHud();
        await wait(480);
      }

      if (choice.drift) {
        const banner = document.getElementById("banner-stage");
        if (!banner || banner.classList.contains("hidden") || !banner.classList.contains("is-ready")) {
          await this.scenes.presentBanner("眼前的幡帛开始飘动，试图引着我向前走去。");
        }
        await this.scenes.followBannerAway();
        await wait(320);
      }

      if (choice.next && choice.next !== "title") {
        this.state.unlocked.add(unlockNodeFor(choice.next));
      }
      saveState(this.state);

      if (choice.faint) {
        this.state.flags.add(choice.faintFlag || "faintedOnce");
        saveState(this.state);
        await this.goTo(choice.next, {
          veilOverride: choice.veilOverride || "黑暗涌上来。你失去了意识。",
        });
        return;
      }

      await this.goTo(choice.next, {
        reset: Boolean(choice.reset),
        veilOverride: choice.veilOverride,
      });
    } finally {
      this.#choosing = false;
    }
  }

  handleHotspot(hotspot) {
    const action = hotspot.action;
    if (!action) return;

    if (action.type === "goto") {
      this.goTo(action.sceneId, { reset: Boolean(action.reset) });
      return;
    }

    if (action.type === "rite") {
      this.#openRite(hotspot);
      return;
    }

    if (action.type === "trace") {
      this.#traceOffering(hotspot);
      return;
    }

    if (action.type === "fork") {
      if (
        (this.activeScene?.id === "dragons" ||
          this.activeScene?.id === "lishi" ||
          this.activeScene?.id === "spirit" ||
          this.activeScene?.id === "gate" ||
          this.activeScene?.id === "heaven_gate" ||
          this.activeScene?.id === "heaven") &&
        !this.#narrationDone()
      ) {
        return;
      }
      this.scenes.markHotspotDone(hotspot.id);
      this.scenes.wrapOf(hotspot.id)?.classList.add("is-found");
      if (this.activeScene?.id === "heaven_gate" || this.activeScene?.id === "gate") {
        for (const other of this.activeScene.hotspots ?? []) {
          if (other.id === hotspot.id || other.action?.type !== "fork") continue;
          this.scenes.markHotspotDone(other.id);
          this.scenes.wrapOf(other.id)?.classList.add("is-found");
        }
      }
      this.ui.showDialogue({
        speaker: "旁白",
        text: hotspot.reply || action.title || "路在这里分了。",
      });
      this.#offerFork(hotspot, { delay: action.delay ?? 720 });
      return;
    }

    if (action.type === "knowledge") {
      const scene = this.activeScene ?? getScene(this.state.sceneId);
      if (scene.id === "mortal") {
        this.#handleMortalItem(hotspot);
        return;
      }
      if (this.scenes.isCardOpen(hotspot.id)) {
        this.scenes.closeItemCard();
        return;
      }
      if (this.state.collected.has(action.cardId)) {
        this.ui.showDialogue({
          speaker: "亡魂",
          text: hotspot.reply || "这一件，你已经认得了。",
        });
        this.scenes.wrapOf(hotspot.id)?.classList.add("is-found");
        this.scenes.openItemCard(hotspot, getCard(action.cardId));
        return;
      }
      this.#collect(hotspot);
    }
  }

  handlePan({ atEnd } = {}) {
    if (atEnd !== undefined) this.sceneFlow.atEnd = Boolean(atEnd);
    this.#syncScrollCue();
  }

  #collect(hotspot) {
    const card = getCard(hotspot.action.cardId);
    this.state.collected.add(card.id);
    if (hotspot.id) this.state.traced.add(hotspot.id);
    if (hotspot.action.memoryId) {
      this.state.memories.add(hotspot.action.memoryId);
      const mem = getMemory(hotspot.action.memoryId);
      if (mem) this.ui.showToast(mem.title);
    }
    saveState(this.state);
    this.#refreshHud();

    this.ui.showDialogue({
      speaker: "亡魂",
      text: hotspot.reply || card.note,
    });

    const wrap = this.scenes.wrapOf(hotspot.id);
    if (wrap?.classList.contains("outline-hotspot")) {
      wrap.classList.add("is-found", "is-done");
      this.scenes.markHotspotDone(hotspot.id);
      this.scenes.openItemCard(hotspot, card);
    } else {
      this.scenes.openItemCard(hotspot, card);
      this.scenes.markHotspotDone(hotspot.id);
      this.fx.playFx(wrap, hotspot.fx);
    }

    const scene = this.activeScene ?? getScene(this.state.sceneId);
    if (scene.afterCollect && scene.afterCollect.cardId === card.id) {
      if (scene.afterCollect.autoFaint) this.#scheduleFaint(scene.afterCollect);
      else this.#offerFork(scene.afterCollect, { delay: 1400 });
    }
    if (scene.type === "ritual") this.#maybeEnterNight(scene);
  }

  #scheduleFaint(spec) {
    clearTimeout(this.#faintTimer);
    this.#faintTimer = setTimeout(() => {
      this.choose({
        faint: true,
        faintFlag: spec.faintFlag,
        next: spec.next,
        veilOverride: spec.veilOverride,
      });
    }, spec.delay ?? 2400);
  }

  #scheduleReturn(spec) {
    clearTimeout(this.#faintTimer);
    this.#faintTimer = setTimeout(() => {
      if (spec.faint) {
        this.choose({
          faint: true,
          faintFlag: spec.faintFlag,
          next: spec.next,
          veilOverride: spec.veilOverride,
        });
        return;
      }
      this.goTo(spec.next, {
        veilOverride: spec.veilOverride,
      });
    }, spec.delay ?? 1600);
  }

  #mortalItemIds(scene = this.activeScene) {
    return (scene?.hotspots ?? []).filter((item) => item.id !== "banner").map((item) => item.id);
  }

  #mortalItemsReady(scene = this.activeScene) {
    const needed = this.#mortalItemIds(scene);
    return needed.length > 0 && needed.every((id) => this.state.traced.has(id));
  }

  #handleMortalItem(hotspot) {
    if (hotspot.id === "banner") {
      if (!this.#mortalItemsReady()) {
        this.ui.showDialogue({
          speaker: "旁白",
          text: "幡在风里动。席上的人与器物，还没看完。",
        });
        return;
      }
      if (!this.state.flags.has("mortal:culture-dismissed")) {
        this.#showMortalCultureCard();
        return;
      }
      if (this.state.flags.has("mortal:fork")) {
        this.#summonMortalBanner();
        return;
      }
      this.#startMortalBannerCall();
      return;
    }

    const firstLook = !this.state.traced.has(hotspot.id);
    if (firstLook) {
      this.state.traced.add(hotspot.id);
      saveState(this.state);
      this.#refreshHud();
      if (hotspot.action?.cardId && !this.state.collected.has(hotspot.action.cardId)) {
        this.#collect(hotspot);
      } else {
        this.scenes.wrapOf(hotspot.id)?.classList.add("is-found", "is-done");
        this.ui.showDialogue({
          speaker: "亡魂",
          text: hotspot.reply || "这一件，你已经认得了。",
        });
      }
    } else {
      this.scenes.wrapOf(hotspot.id)?.classList.add("is-found");
      this.ui.showDialogue({
        speaker: "亡魂",
        text: hotspot.reply || "这一件，你已经认得了。",
      });
    }

    if (firstLook && this.#mortalItemsReady()) {
      this.#showMortalCultureCard();
      return;
    }
    if (firstLook) {
      const remain = this.#mortalRemainLabels();
      if (remain.length && remain.length <= 3) {
        this.ui.text.textContent = `${this.ui.text.textContent} 案上还剩${remain.join("、")}。`;
      }
    }
  }

  #mortalRemainLabels(scene = this.activeScene) {
    return this.#mortalItemIds(scene)
      .filter((id) => !this.state.traced.has(id))
      .map((id) => (scene?.hotspots ?? []).find((item) => item.id === id)?.label)
      .filter(Boolean);
  }

  #showMortalCultureCard({ resume = false } = {}) {
    if (this.#cultureCardOpen) return;
    if (this.state.flags.has("mortal:culture-dismissed")) {
      this.#startMortalBannerCall({ resume });
      return;
    }

    const card = getCard("han-feast");
    if (!card) return;

    this.#cultureCardOpen = true;
    this.scenes.closeItemCard();
    this.scenes.setExploreEnabled(false);
    this.ui.hidePaths();

    if (!this.state.collected.has(card.id)) {
      this.state.collected.add(card.id);
    }
    this.state.memories.add("han-culture");
    this.state.flags.add("mortal:culture-shown");
    saveState(this.state);
    this.#refreshHud();

    this.ui.showDialogue({
      speaker: "旁白",
      text: "乐与食都在这一席上。再点这张卡，便可收起。",
    });
    this.ui.showCultureSlip(
      card,
      () => {
        this.#cultureCardOpen = false;
        this.state.flags.add("mortal:culture-dismissed");
        saveState(this.state);
        this.#startMortalBannerCall();
      },
      { clickToDismiss: true, hint: "再点卡片收起" },
    );
  }

  #startMortalBannerCall({ resume = false } = {}) {
    const scene = this.activeScene;
    if (!scene || scene.id !== "mortal") return;
    if (this.state.flags.has("mortal:fork")) {
      this.#summonMortalBanner({ resume: true });
      return;
    }
    const lines = this.#mortalBannerCallLines(scene);
    if (!lines.length) {
      this.#summonMortalBanner();
      return;
    }
    this.#bannerCallActive = true;
    this.#bannerCallIndex = 0;
    this.scenes.setExploreEnabled(false);
    this.ui.hidePaths();
    this.#showMortalBannerCallLine();
  }

  #mortalBannerCallLines(scene = this.activeScene) {
    if (Array.isArray(scene?.bannerCallLines) && scene.bannerCallLines.length) {
      return scene.bannerCallLines;
    }
    if (scene?.bannerCall) return [scene.bannerCall];
    return [];
  }

  #showMortalBannerCallLine() {
    const lines = this.#mortalBannerCallLines();
    const text = lines[Math.min(this.#bannerCallIndex, lines.length - 1)] || "";
    this.ui.showDialogue({
      speaker: "旁白",
      text,
      showContinue: true,
    });
  }

  #advanceMortalBannerCall() {
    const lines = this.#mortalBannerCallLines();
    if (!lines.length) {
      this.#bannerCallActive = false;
      this.#summonMortalBanner();
      return;
    }
    if (this.#bannerCallIndex < lines.length - 1) {
      this.#bannerCallIndex += 1;
      this.#showMortalBannerCallLine();
      return;
    }
    this.#bannerCallActive = false;
    this.#summonMortalBanner();
  }

  async #summonMortalBanner({ resume = false } = {}) {
    const scene = this.activeScene;
    if (!scene || scene.id !== "mortal" || this.#summoning || this.#pathsShown) return;
    if (!this.#mortalItemsReady(scene)) return;

    this.#summoning = true;
    this.#bannerCallActive = false;
    this.scenes.setExploreEnabled(false);
    try {
      if (!this.state.flags.has("mortal:fork")) {
        this.state.flags.add("mortal:fork");
        if (!this.state.collected.has("banner")) {
          this.state.collected.add("banner");
          this.state.memories.add("shore");
          this.#refreshHud();
        }
        saveState(this.state);
      }
      const lines = this.#mortalBannerCallLines(scene);
      const last = lines[lines.length - 1];
      if (last) {
        this.ui.showDialogue({ speaker: "旁白", text: last, showContinue: false });
      } else {
        this.ui.hideDialogue();
      }
      await this.scenes.presentBanner("", { fromLeft: !resume });
      this.scenes.inputLocked = false;
      this.#offerFork(scene, { delay: 240 });
    } finally {
      this.#summoning = false;
    }
  }

  #offerFork(source, { delay = 800 } = {}) {
    const paths = source?.paths;
    if (!paths?.length || this.#pathsShown) return;
    const sceneId = this.state.sceneId;
    this.#pathsShown = true;
    clearTimeout(this.#forkTimer);
    this.#forkTimer = setTimeout(() => {
      if (this.state.sceneId !== sceneId) return;
      this.scenes.closeItemCard();
      this.ui.showPaths(paths, (path) => this.choose(path), source.action?.title || source.forkTitle);
    }, delay);
  }

  #syncTraced(scene) {
    for (const hotspot of scene.hotspots ?? []) {
      if (hotspot.action?.type === "trace" && this.state.traced.has(hotspot.id)) {
        this.scenes.wrapOf(hotspot.id)?.classList.add("is-found", "is-done");
      }
      if (hotspot.outline && hotspot.action?.type === "knowledge") {
        const seen =
          scene.id === "mortal"
            ? this.state.traced.has(hotspot.id)
            : this.state.collected.has(hotspot.action.cardId);
        if (seen) this.scenes.wrapOf(hotspot.id)?.classList.add("is-found");
      }
    }
  }

  #traceOffering(hotspot) {
    const scene = this.activeScene ?? getScene(this.state.sceneId);
    const wrap = this.scenes.wrapOf(hotspot.id);
    if (this.state.traced.has(hotspot.id)) {
      this.ui.showDialogue({ speaker: "旁白", text: hotspot.reply });
      this.#maybeFinishAltarTrace(scene);
      return;
    }
    this.state.traced.add(hotspot.id);
    wrap?.classList.add("is-found", "is-done");
    this.ui.showDialogue({ speaker: "亡魂", text: hotspot.reply });
    this.ui.showToast(hotspot.label);
    saveState(this.state);
    this.#refreshHud();
    this.#maybeFinishAltarTrace(scene);
  }

  #maybeFinishAltarTrace(scene) {
    const needed = (scene.hotspots ?? [])
      .filter((item) => item.action?.type === "trace")
      .map((item) => item.id);
    if (!needed.length || !needed.every((id) => this.state.traced.has(id))) return;
    if (!this.state.ritesDone.has("altar-rite")) {
      this.state.ritesDone.add("altar-rite");
      saveState(this.state);
      this.ui.showDialogue({
        speaker: "旁白",
        text: (scene.rites ?? []).find((rite) => rite.id === "altar-rite")?.complete || "席上的酒食都叫过名了。",
      });
    }
    this.#maybeShowCulture(scene);
  }

  #openRite(hotspot) {
    const scene = getScene(this.state.sceneId);
    const rite = (scene.rites ?? []).find((item) => item.id === hotspot.action.riteId);
    if (!rite) return;
    if (this.state.ritesDone.has(rite.id)) {
      this.ui.showDialogue({ speaker: "旁白", text: rite.complete });
      this.#maybeShowCulture(scene);
      return;
    }
    this.scenes.closeItemCard();
    this.fx.mountRite(rite, () => this.#finishRite(rite, hotspot.id));
  }

  #finishRite(rite, hotspotId) {
    const scene = getScene(this.state.sceneId);
    this.state.ritesDone.add(rite.id);
    if (hotspotId) this.state.traced.add(hotspotId);
    saveState(this.state);
    this.#refreshHud();
    this.ui.showDialogue({ speaker: "旁白", text: rite.complete });
    const wrap = this.scenes.wrapOf(hotspotId);
    wrap?.classList.remove("is-calling", "is-scattered");
    wrap?.classList.add("is-tidied", "is-done");
    setTimeout(() => {
      this.ui.clearRites();
      this.#maybeShowCulture(scene);
    }, 900);
  }

  #maybeShowCulture(scene) {
    const needed = (scene.rites ?? []).map((rite) => rite.id);
    if (!needed.every((id) => this.state.ritesDone.has(id))) return;
    if (this.state.collected.has("han-feast")) {
      this.#maybeEnterNight(scene);
      return;
    }

    const card = getCard("han-feast");
    this.ui.showDialogue({ speaker: "旁白", text: "乐与食都在这一席上。竹简自己展开了。" });
    this.ui.showCultureSlip(card, () => {
      this.state.collected.add(card.id);
      this.state.memories.add("han-culture");
      saveState(this.state);
      this.#refreshHud();
      this.ui.showToast("汉代音乐与饮食文化");
      this.ui.clearRites();
      this.#maybeEnterNight(scene);
    });
  }

  async #maybeEnterNight(scene) {
    if (this.#nightReady || scene.id !== "human_culture") return;
    if (!this.state.collected.has("han-feast") && !hasCompleteHumanMemory(this.state.memories)) return;
    if (!this.state.memories.has("earthly")) this.state.memories.add("earthly");
    if (!this.state.memories.has("han-culture")) this.state.memories.add("han-culture");

    this.#nightReady = true;
    this.ui.clearRites();
    this.scenes.setNight();
    this.ui.setChapter("人间 · 夜");
    this.state.flags.add("memory:complete");
    this.state.flags.delete("memory:incomplete");
    saveState(this.state);
    this.#refreshHud();

    const last = scene.nightLines[scene.nightLines.length - 1];
    this.ui.showDialogue({
      speaker: last.speaker,
      text: scene.nightLines.map((line) => line.text).join(""),
    });
    this.ui.continue.classList.add("hidden");
    await this.scenes.presentBanner("幡帛从黄昏的席边升起，引你去往双龙之路。");
    this.scenes.inputLocked = false;
    this.ui.showPaths(scene.paths, (path) => this.choose(path), "夜色里只剩这一条路");
  }

  #endingText(scene) {
    if (scene.endingKind === "trap") {
      return scene.endings.default;
    }
    let body = scene.endings.default;
    if (this.state.flags.has("choice:listen")) body = scene.endings["choice:listen"];
    if (this.state.flags.has("choice:attack")) body = scene.endings["choice:attack"];
    if (this.state.flags.has("memory:complete")) return `${scene.endings.complete} ${body}`;
    if (this.state.flags.has("memory:incomplete")) return `${scene.endings.incomplete} ${body}`;
    return body;
  }

  #refreshHud() {
    this.ui.updateCardCount(this.state.collected.size);
    this.ui.renderMemories();
    this.ui.renderExploreDots(this.#exploreProgress());
  }

  #exploreTargets(scene = this.activeScene) {
    if (!scene || scene.type === "title" || scene.type === "ending") return [];
    return (scene.hotspots ?? []).filter((item) => {
      if (item.id === "banner") return false;
      const type = item.action?.type;
      return type === "knowledge" || type === "trace" || type === "rite";
    });
  }

  #isExplored(hotspot, scene = this.activeScene) {
    if (this.state.traced.has(hotspot.id)) return true;
    if (hotspot.action?.type === "rite") return this.state.ritesDone.has(hotspot.action.riteId);
    const cardId = hotspot.action?.cardId;
    if (!cardId || !this.state.collected.has(cardId)) return false;
    const siblings = (scene?.hotspots ?? []).filter((item) => item.action?.cardId === cardId);
    return siblings.length <= 1;
  }

  #exploreProgress(scene = this.activeScene) {
    return this.#exploreTargets(scene).map((hotspot) => ({
      id: hotspot.id,
      label: hotspot.label,
      lit: this.#isExplored(hotspot, scene),
    }));
  }

  #homeView() {
    return {
      nodes: LEVEL_NODES,
      unlocked: this.state.unlocked,
      lastSceneId: this.state.lastSceneId,
      hasProgress: Boolean(this.state.lastSceneId) || this.state.collected.size > 0,
    };
  }

  #shouldDimOnEnter(scene) {
    return (
      Boolean(scene?.lines?.length) &&
      scene.type !== "title" &&
      scene.type !== "ending" &&
      !scene.skipDim
    );
  }

  #narrationDone(scene = this.activeScene) {
    const lines = Array.isArray(scene?.lines) ? scene.lines : [];
    if (this.scenes.isDimmed()) return false;
    return lines.length === 0 || this.lineIndex >= lines.length - 1;
  }

  #syncScrollCue() {
    const scene = this.activeScene ?? getScene(this.state.sceneId);
    const show =
      scene.type === "story" &&
      !scene.paths &&
      Boolean(scene.choices?.length) &&
      !scene.hideEndCue &&
      this.#narrationDone(scene) &&
      this.sceneFlow.atEnd &&
      !this.scenes.choicesShown;
    this.ui.setCueVisible(show);
  }

  #openChoices() {
    const scene = this.activeScene ?? getScene(this.state.sceneId);
    if (scene.type !== "story" || this.scenes.choicesShown) return;
    this.ui.hideCue();
    this.scenes.hideEndCue();
    this.scenes.revealChoices(scene);
  }

  #bindViewport() {
    window.Device?.apply?.();
    window.Device?.onChange?.(() => {
      this.scenes?.relayout?.();
    });
  }

  #bindUi() {
    const bindPress = window.bindPress;
    bindPress?.(this.ui.continue, () => {
      const scene = this.activeScene ?? resolveScene(getScene(this.state.sceneId), this.state);
      if (this.#nightReady) return;
      const lines = Array.isArray(scene.lines) ? scene.lines : [];
      if (this.lineIndex < lines.length - 1) {
        this.lineIndex += 1;
        this.renderDialogue(scene);
        return;
      }
      if (scene.recallFinale) {
        this.#queueRecallFinale();
        return;
      }
      if (scene.clickNext) {
        this.goTo(scene.clickNext);
        return;
      }
      if (scene.id === "mortal" && this.#bannerCallActive) {
        this.#advanceMortalBannerCall();
        return;
      }
      if (this.scenes.isDimmed()) {
        this.scenes.setDimmed(false);
        this.renderDialogue(scene);
      }
    });

    bindPress?.(this.ui.home, () => {
      if (this.state.sceneId !== "title") this.goTo("title");
    });
    bindPress?.(this.ui.cue, () => this.#openChoices());
    bindPress?.($("btn-close-atlas"), () => this.ui.closeAtlas());
    bindPress?.($("btn-atlas"), () => {
      this.ui.openAtlas({
        cards: [...this.state.collected].map((id) => getCard(id)),
        memories: [...this.state.memories].map((id) => getMemory(id)).filter(Boolean),
      });
    });
    document.querySelectorAll("[data-close]").forEach((el) => {
      bindPress?.(el, () => {
        if (el.dataset.close === "atlas") this.ui.closeAtlas();
      });
    });
  }

  #setupDebug() {
    if (!this.debug || !this.ui.debug) return;
    this.ui.debug.classList.remove("hidden");
    const select = $("debug-scene");
    select.replaceChildren();
    for (const id of SCENE_ORDER) {
      const option = document.createElement("option");
      option.value = id;
      option.textContent = getScene(id).title;
      select.append(option);
    }
    window.bindPress?.($("debug-jump"), () => this.goTo(select.value));
    window.bindPress?.($("debug-reset"), () => this.goTo("title", { reset: true }));
  }

  #syncDebugScene() {
    const select = $("debug-scene");
    if (this.debug && select) select.value = this.state.sceneId;
  }
}

function createState() {
  return {
    sceneId: GAME_META.startScene,
    lastSceneId: null,
    flags: new Set(),
    collected: new Set(),
    memories: new Set(),
    ritesDone: new Set(),
    traced: new Set(),
    visited: new Set(),
    unlocked: new Set(["mortal"]),
  };
}

function loadState() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return createState();
    const data = JSON.parse(raw);
    const state = createState();
    state.lastSceneId = data.lastSceneId ?? null;
    state.collected = new Set(data.collected ?? []);
    state.memories = new Set(data.memories ?? []);
    state.ritesDone = new Set(data.ritesDone ?? []);
    state.traced = new Set(data.traced ?? []);
    state.flags = new Set(data.flags ?? []);
    state.visited = new Set(data.visited ?? []);
    state.unlocked = new Set(data.unlocked?.length ? data.unlocked : ["mortal"]);
    state.unlocked.add("mortal");
    return state;
  } catch {
    return createState();
  }
}

function saveState(state) {
  localStorage.setItem(
    SAVE_KEY,
    JSON.stringify({
      lastSceneId: state.lastSceneId,
      collected: [...state.collected],
      memories: [...state.memories],
      ritesDone: [...state.ritesDone],
      traced: [...state.traced],
      flags: [...state.flags],
      visited: [...state.visited],
      unlocked: [...state.unlocked],
    }),
  );
}

function unlockNodeFor(sceneId, scene) {
  if (scene?.homeNode) return scene.homeNode;
  if (sceneId === "human_culture" || sceneId === "nameless") return "mortal";
  if (
    sceneId === "no_medicine" ||
    sceneId === "abyss" ||
    sceneId === "ghost_world" ||
    sceneId === "lingzhi" ||
    sceneId === "lishi"
  ) {
    return "dragons";
  }
  return sceneId;
}

function hasVeilCopy(text) {
  if (Array.isArray(text)) return text.some((line) => String(line || "").trim());
  return Boolean(text);
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const game = new Game();
game.start();
})();
