# 升天图 · 第三版

对着马王堆一号汉墓 T 形帛画做的二维互动绘本。玩家以亡魂进画，走人间、双龙、句芒、天门，经使者引荐后见到人身龙尾的天神。

仓库：https://github.com/mii22128/Yinhunlu  
GitHub Pages：https://mii22128.github.io/Yinhunlu/  
游戏入口：https://mii22128.github.io/Yinhunlu/shengtian-tu/

把本仓库推到 GitHub 并在 Settings → Pages 选择 **GitHub Actions** 后，`main` 分支会自动发布。工作流见 `.github/workflows/pages.yml`。

本版标签：**v3**

## 小红书小工具包

符合 minitool-zip-builder 1.6.0 的离线 zip 在仓库根目录 [`minitool.zip`](./minitool.zip)。解压后根目录即为 `index.html`，可上传容器。重新生成：

```bash
python3 scripts/build_minitool.py
python3 .claude/minitool-zip-builder/scripts/audit_artifact.py minitool.zip
```

包体约 9.15 MiB（上限 10 MiB；建议 2 MiB）。画幅素材较大，已保留可玩画质。Chrome 61 / 真机 WebView **兼容性未实测**，性能 **未实测**。

## 下载 v3 成品包

[`Yinhunlu-v3.zip`](./Yinhunlu-v3.zip) 与 [`Yinhunlu.zip`](./Yinhunlu.zip) 是同一份 **v3 最终成品**（封面只有「展卷 / 继续上次」，没有下载压缩包按钮）。解压后这一层应直接看到 `index.html` 与 `shengtian-tu/`。重新打包：`./pack-release.sh`。解压后：

1. 打开 `shengtian-tu/index.html` 即可双击游玩（普通脚本，不依赖构建）。
2. 或在解压目录执行：

```bash
cd shengtian-tu
python3 -m http.server 43172 --bind 127.0.0.1
```

浏览器打开 `http://127.0.0.1:43172`。调试跳关：`http://127.0.0.1:43172/?debug=1`

手机请**横屏**游玩；竖屏会提示翻转。进度存在浏览器本地，不会跟着压缩包走。

## 怎么玩（主线摘要）

1. **人间**：点击宴乐人物与案上酒食，解锁图鉴。点齐后先出知识卡，再点卡片收起，幡帛飘出分路。左边留恋人间 → 水墨铺满 → 结局「无名游魂」。右边跟幡 → 双龙。
2. **双龙**：玉璧闪烁后分路。回头 → 玄武衔芝。不吃灵芝 → 结局「有病不吃药的来」；服下 → 力士。接过或不接都进结局「永堕深渊」。继续向前 → 句芒。
3. **句芒鸟**：默默听着 → 天门。掐死它 → 生命流尽，回到卷首。
4. **双龙天门**：辛追夫人、侍女与天界使者。点发光的使者。献簪或径直向前，都会抵达守门。请使者引荐（已递簪）→ 天门开启。自行说明 → 结局「没被邀」。
5. **天界**：守门通过后进入天界全景：上横为天，人首蛇身之神与五鹤、日月金乌蟾兔、应龙帝阍。点续前往天神。
6. **天神**：云雾中人身龙尾的天神发问后，旅途画面依序拼出，水墨散去现出 T 形帛画。点「回到卷首」可再走一遍。

## 部署到 GitHub Pages

根目录必须直接能看到 `index.html`、`.nojekyll` 和 `shengtian-tu/`。Settings → Pages 选 **Deploy from a branch → main → / (root)**。

Windows 可在项目根目录运行 `publish-to-github.ps1 v3`：把新文件追加到现有 GitHub 历史上，并打标签。不要使用 `--force`。

## 目录

```
Yinhunlu/
├── README.md
├── Yinhunlu.zip
├── index.html             # 跳到游戏（GitHub Pages）
├── .nojekyll
├── vercel.json
├── publish-to-github.ps1
└── shengtian-tu/          # 游戏本体
```
