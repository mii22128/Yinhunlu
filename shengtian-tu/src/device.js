/**
 * 设备检测：按视口宽度在 desktop / tablet / mobile 之间切换，
 * 并通知两套 UI。剧情与场景数据不在这里。
 */

(() => {
const MOBILE_MAX = 767;
const TABLET_MAX = 1200;

const listeners = new Set();
let current = null;

function viewportSize() {
  const view = window.visualViewport;
  return {
    width: Math.round(view?.width ?? window.innerWidth),
    height: Math.round(view?.height ?? window.innerHeight),
  };
}

function readDevice() {
  const { width, height } = viewportSize();
  const portrait = height > width;
  const landscapePhone = !portrait && height <= 540 && width <= 1024;
  const kind = width < 768 || landscapePhone ? "mobile" : width <= TABLET_MAX ? "tablet" : "desktop";
  const ui = kind === "mobile" ? "mobile" : "desktop";
  return {
    width,
    height,
    kind,
    ui,
    portrait,
    landscape: !portrait,
  };
}

function applyAttributes(info) {
  const root = document.documentElement;
  root.dataset.ui = info.ui;
  root.dataset.device = info.kind;
  root.dataset.orientation = info.portrait ? "portrait" : "landscape";
  root.style.setProperty("--vvw", `${info.width}px`);
  root.style.setProperty("--vvh", `${info.height}px`);
  root.classList.toggle("is-mobile", info.ui === "mobile");
  root.classList.toggle("is-desktop", info.ui === "desktop");
  root.classList.toggle("is-tablet", info.kind === "tablet");
  root.classList.toggle("is-portrait", info.portrait);
  root.classList.toggle("is-landscape", info.landscape);
}

function apply() {
  const next = readDevice();
  const prev = current;
  const changed = !prev || prev.ui !== next.ui || prev.portrait !== next.portrait || prev.kind !== next.kind;
  current = next;
  applyAttributes(next);

  if (next.ui === "mobile") window.MobileUI?.apply(next);
  else window.DesktopUI?.apply(next);

  if (changed) {
    for (const fn of listeners) fn(next, prev);
  }
  return next;
}

function onChange(fn) {
  if (typeof fn === "function") listeners.add(fn);
  return () => listeners.delete(fn);
}

function watch() {
  const sync = () => apply();
  window.addEventListener("resize", sync);
  window.addEventListener("orientationchange", sync);
  window.visualViewport?.addEventListener("resize", sync);
  window.visualViewport?.addEventListener("scroll", sync);
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", sync, { once: true });
  } else {
    sync();
  }
}

const Device = {
  MOBILE_MAX,
  TABLET_MAX,
  read: readDevice,
  apply,
  watch,
  onChange,
  isMobile: () => (current ?? readDevice()).ui === "mobile",
  isDesktop: () => (current ?? readDevice()).ui === "desktop",
  get info() {
    return current ?? readDevice();
  },
};

window.Device = Device;
window.isCompactUi = () => Device.isMobile();
window.layoutGameCanvas = apply;
watch();
})();
