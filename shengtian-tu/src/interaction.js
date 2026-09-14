/**
 * 点击反馈、乐器出声、祭席上供。
 */

(() => {
const MUSIC_PIECES = [
  { id: "bell", label: "编钟", icon: "assets/icon/chime.svg", freqs: [523, 784], kind: "bell" },
  { id: "qin", label: "琴", icon: "assets/icon/qin.svg", freqs: [294, 440], kind: "qin" },
  { id: "sheng", label: "笙", icon: "assets/icon/sheng.svg", freqs: [392, 494, 588], kind: "sheng" },
];

const ALTAR_PIECES = [
  { id: "wine", label: "酒", icon: "assets/icon/wine.svg" },
  { id: "grain", label: "谷物", icon: "assets/icon/grain.svg" },
  { id: "meat", label: "肉类", icon: "assets/icon/meat.svg" },
  { id: "fruit", label: "水果", icon: "assets/icon/fruit.svg" },
];

class InteractionDirector {
  constructor({ riteLayer }) {
    this.riteLayer = riteLayer;
    this.#audio = null;
  }

  playFx(wrap, kind) {
    if (!wrap) return;
    wrap.classList.remove("fx-weep", "fx-chime", "fx-feast", "fx-ink");
    wrap.offsetHeight;
    if (kind === "weep") wrap.classList.add("fx-weep");
    if (kind === "chime") {
      wrap.classList.add("fx-chime");
      this.playInstrument("bell");
    }
    if (kind === "feast") wrap.classList.add("fx-feast");
    if (kind === "ink") wrap.classList.add("fx-ink");
  }

  playInstrument(id) {
    const piece = MUSIC_PIECES.find((item) => item.id === id) ?? MUSIC_PIECES[0];
    try {
      const ctx = this.#context();
      const now = ctx.currentTime;
      piece.freqs.forEach((freq, index) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = piece.kind === "sheng" ? "triangle" : piece.kind === "bell" ? "sine" : "sawtooth";
        osc.frequency.value = freq;
        const peak = piece.kind === "qin" ? 0.06 : 0.05;
        const hold = piece.kind === "sheng" ? 1.1 : 0.7;
        gain.gain.setValueAtTime(0, now + index * 0.02);
        gain.gain.linearRampToValueAtTime(peak, now + index * 0.02 + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.001, now + hold);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + index * 0.02);
        osc.stop(now + hold + 0.05);
      });
    } catch {
      /* 需由点击唤起音频 */
    }
  }

  stopAmbient() {
    /* 乐器余音自行结束，不关闭上下文 */
  }

  mountRite(rite, onComplete) {
    if (rite.kind === "listen") {
      this.#mountListen(rite, onComplete);
      return;
    }
    this.#mountOffer(rite, onComplete);
  }

  #mountListen(rite, onComplete) {
    this.riteLayer.classList.remove("hidden");
    this.riteLayer.replaceChildren();

    const board = document.createElement("section");
    board.className = "rite-board is-listen";
    board.innerHTML = `
      <header class="rite-head">
        <h3>${rite.title}</h3>
        <p>${rite.hint}</p>
      </header>
      <div class="listen-row" data-listen></div>
    `;

    const heard = new Set();
    const row = board.querySelector("[data-listen]");

    for (const piece of MUSIC_PIECES) {
      const token = this.#token(piece);
      token.classList.add("is-listen");
      window.bindPress?.(token, () => {
        this.playInstrument(piece.id);
        token.classList.add("is-heard");
        heard.add(piece.id);
        if (heard.size === MUSIC_PIECES.length && !board.classList.contains("is-done")) {
          board.classList.add("is-done");
          onComplete(rite);
        }
      });
      row.append(token);
    }

    this.riteLayer.append(board);
  }

  #mountOffer(rite, onComplete) {
    this.riteLayer.classList.remove("hidden");
    this.riteLayer.replaceChildren();

    const board = document.createElement("section");
    board.className = "rite-board is-offer";
    board.innerHTML = `
      <header class="rite-head">
        <h3>${rite.title}</h3>
        <p>${rite.hint}</p>
      </header>
      <div class="rite-slots" data-slots></div>
      <div class="rite-tray" data-tray></div>
    `;

    const slotBox = board.querySelector("[data-slots]");
    const tray = board.querySelector("[data-tray]");

    for (let i = 0; i < ALTAR_PIECES.length; i += 1) {
      const slot = document.createElement("div");
      slot.className = "rite-slot";
      slot.dataset.slot = String(i);
      slotBox.append(slot);
    }

    for (const piece of ALTAR_PIECES) {
      tray.append(this.#token(piece));
    }

    this.#bindDrag(board, () => {
      const filled = [...slotBox.children].every((slot) => slot.dataset.filled === "1");
      if (!filled || board.classList.contains("is-done")) return;
      board.classList.add("is-done");
      onComplete(rite);
    });

    this.riteLayer.append(board);
  }

  #token(piece) {
    const token = document.createElement("button");
    token.type = "button";
    token.className = "rite-token";
    token.dataset.piece = piece.id;
    token.innerHTML = `<img src="${piece.icon}" alt="" /><span>${piece.label}</span>`;
    return token;
  }

  #bindDrag(board, onMaybeDone) {
    const tray = board.querySelector("[data-tray]");
    const slots = [...board.querySelectorAll(".rite-slot")];

    board.querySelectorAll(".rite-token").forEach((token) => {
      token.addEventListener("pointerdown", (event) => {
        if (board.classList.contains("is-done")) return;
        event.preventDefault();
        event.stopPropagation();
        token.setPointerCapture(event.pointerId);
        token.classList.add("is-dragging");
        const startX = event.clientX;
        const startY = event.clientY;
        const origin = token.getBoundingClientRect();
        let dx = 0;
        let dy = 0;

        const move = (ev) => {
          dx = ev.clientX - startX;
          dy = ev.clientY - startY;
          token.style.transform = `translate(${dx}px, ${dy}px)`;
        };

        const placeIn = (slot) => {
          slot.dataset.filled = "1";
          slot.append(token);
          token.classList.add("is-placed");
          onMaybeDone();
        };

        const end = (ev) => {
          token.releasePointerCapture(ev.pointerId);
          token.removeEventListener("pointermove", move);
          token.removeEventListener("pointerup", end);
          token.classList.remove("is-dragging");
          token.style.transform = "";

          const nextEmpty = () => slots.find((slot) => slot.dataset.filled !== "1");

          if (Math.hypot(dx, dy) < 12) {
            const slot = nextEmpty();
            if (slot) placeIn(slot);
            return;
          }

          const dropX = origin.left + origin.width / 2 + dx;
          const dropY = origin.top + origin.height / 2 + dy;
          const hit = slots.find((slot) => {
            if (slot.dataset.filled === "1") return false;
            const box = slot.getBoundingClientRect();
            return dropX >= box.left && dropX <= box.right && dropY >= box.top && dropY <= box.bottom;
          });

          if (!hit) {
            const slot = nextEmpty();
            if (slot) placeIn(slot);
            else if (token.parentElement !== tray) tray.append(token);
            return;
          }

          placeIn(hit);
        };

        token.addEventListener("pointermove", move);
        token.addEventListener("pointerup", end);
      });
    });
  }

  #context() {
    if (!this.#audio) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      this.#audio = new Ctx();
    }
    if (this.#audio.state === "suspended") this.#audio.resume();
    return this.#audio;
  }

  #audio = null;
}

window.InteractionDirector = InteractionDirector;
})();
