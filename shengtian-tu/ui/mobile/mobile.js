/**
 * 手机界面：横屏全幅、底部知识卡、竖屏提示旋转。
 */

(() => {
function apply(info) {
  const prompt = document.getElementById("rotate-prompt");
  if (!prompt) return;
  const needRotate = Boolean(info?.portrait);
  prompt.classList.toggle("hidden", !needRotate);
  prompt.toggleAttribute("hidden", !needRotate);
  prompt.setAttribute("aria-hidden", needRotate ? "false" : "true");
  const orientation = window.screen?.orientation;
  if (needRotate && typeof orientation?.lock === "function") {
    orientation.lock("landscape").catch(() => {});
  }
}

window.MobileUI = {
  name: "mobile",
  apply,
  usesSideCard: false,
  usesSheet: true,
};

window.Device?.apply?.();
})();
