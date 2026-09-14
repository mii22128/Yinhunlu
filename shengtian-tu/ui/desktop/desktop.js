/**
 * 电脑 / 平板界面：16:9 画心、左右分路、知识卡贴在热区一侧。
 */

(() => {
function hideRotate() {
  const prompt = document.getElementById("rotate-prompt");
  if (!prompt) return;
  prompt.classList.add("hidden");
  prompt.setAttribute("hidden", "");
  prompt.setAttribute("aria-hidden", "true");
}

function apply() {
  hideRotate();
  const sheet = document.getElementById("knowledge-sheet");
  if (sheet && !sheet.classList.contains("hidden")) {
    sheet.classList.add("hidden");
    sheet.classList.remove("is-open");
  }
}

window.DesktopUI = {
  name: "desktop",
  apply,
  usesSideCard: true,
  usesSheet: false,
};
})();
