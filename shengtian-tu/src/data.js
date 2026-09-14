/**
 * 升天图 · 剧情与知识
 * 第一关：亡魂苏醒——人间与彼岸的选择
 * 第二段：双龙分路，以及向龙尾而去的鬼怪世界线
 * 第三层：句芒鸟——默默听着才能继续，掐死则生命流逝、回到卷首
 * 第四题：双龙天门——献簪或径直向前，皆至守门；无荐则结局「没被邀」
 */

(() => {
const GAME_META = {
  id: "shengtian-tu",
  title: "升天图",
  subtitle: "一场穿越汉代宇宙观的亡魂旅程",
  startScene: "title",
};

const SCENE_ORDER = [
  "title",
  "mortal",
  "human_culture",
  "nameless",
  "dragons",
  "ghost_world",
  "lingzhi",
  "no_medicine",
  "lishi",
  "abyss",
  "ghost_trap",
  "spirit",
  "jumang_listen",
  "jumang_wither",
  "gate",
  "heaven_gate",
  "uninvited",
  "heaven_world",
  "heaven",
  "ending",
];

const LEVEL_NODES = [
  { id: "mortal", label: "人间", mark: "祭" },
  { id: "dragons", label: "双龙", mark: "龙" },
  { id: "spirit", label: "句芒", mark: "鸟" },
  { id: "gate", label: "天门", mark: "门" },
  { id: "heaven_gate", label: "守门", mark: "守" },
  { id: "heaven_world", label: "天界", mark: "界" },
  { id: "heaven", label: "天神", mark: "天" },
];

const HUMAN_COMPLETE = ["earthly", "han-culture"];

const MEMORIES = {
  earthly: {
    id: "earthly",
    title: "人间记忆",
    seal: "哭",
    note: "哭泣也是告别，也是把人留在家族里。",
  },
  "ritual-music": {
    id: "ritual-music",
    title: "礼乐记忆",
    seal: "乐",
    note: "乐声规定谁该哭、谁该静。",
  },
  "offering-memory": {
    id: "offering-memory",
    title: "祭祀记忆",
    seal: "祭",
    note: "食物还热着，人间没有把你放下去。",
  },
  shore: {
    id: "shore",
    title: "彼岸线索",
    seal: "幡",
    note: "幡用来招魂，也用来引路。",
  },
  "music-tone": {
    id: "music-tone",
    title: "礼乐之音",
    seal: "音",
    note: "礼乐不仅属于人间，也连接天地。",
  },
  "offering-rite": {
    id: "offering-rite",
    title: "祭祀之礼",
    seal: "礼",
    note: "祭品是人与祖先关系的表达。",
  },
  "han-culture": {
    id: "han-culture",
    title: "乐食之礼",
    seal: "宴",
    note: "以乐侑食，事死如生。",
  },
  "lingzhi-power": {
    id: "lingzhi-power",
    title: "灵芝之力",
    seal: "芝",
    note: "热力冲上四肢，鬼域里也能站住。",
  },
  "saw-world": {
    id: "saw-world",
    title: "人间全景",
    seal: "界",
    note: "席、哭、乐同时铺开，像一张未收的画。",
  },
  "trapped-ghost": {
    id: "trapped-ghost",
    title: "永困",
    seal: "困",
    note: "龙尾之下，升天之路断了。",
  },
  "jumang-faith": {
    id: "jumang-faith",
    title: "生命之信",
    seal: "生",
    note: "听懂之前，先把声音留下。信心因此长出来。",
  },
  "jumang-wither": {
    id: "jumang-wither",
    title: "枯萎",
    seal: "萎",
    note: "掐死生命之鸟，自己也跟着散了。",
  },
  "bribe-path": {
    id: "bribe-path",
    title: "献簪之路",
    seal: "簪",
    note: "发簪递出去，使者的脸色就变了。",
  },
  "feilian-guide": {
    id: "feilian-guide",
    title: "招魂之鸟",
    seal: "廉",
    note: "飞廉接引亡者，路过即是被看见。",
  },
};

const KNOWLEDGE_CARDS = {
  crying: {
    id: "crying",
    title: "哭声中的告别",
    position: "中段 · 哭丧",
    symbol: "以哭送魂，维系家族",
    body: "汉代死亡仪式中的哭泣不仅表达悲伤，也承担向亡者告别、维系家族关系的作用。",
    note: "他们不是只在哭你，也在把你送出门。",
  },
  music: {
    id: "music",
    title: "送往彼岸的音乐",
    position: "中段 · 乐悬",
    symbol: "以乐通天地",
    body: "汉代礼乐不仅用于娱乐，也用于祭祀和沟通天地。",
    note: "乐声一停，席面才真正散。",
  },
  offering: {
    id: "offering",
    title: "死亡之后仍需要食物？",
    position: "中段 · 宴祭陈设",
    symbol: "以食通祖",
    body: "汉代人认为死亡并非生命完全消失，祭品体现人与祖先世界之间的联系。",
    note: "鼎里的气味还热着，像有人刚把你的一份留下。",
  },
  banner: {
    id: "banner",
    title: "引魂之路",
    position: "中段 · 引魂之幡",
    symbol: "招魂、导魂",
    body: "幡帛是连接人间与彼岸的重要媒介，引导亡魂前往另一个世界。",
    note: "你眼前的画，曾经是一件会动的葬具。",
  },
  "music-tone": {
    id: "music-tone",
    title: "礼乐之音",
    position: "黄昏 · 声乐",
    symbol: "金、丝、竹成祭",
    body: "礼乐不仅属于人间，也连接天地。编钟、琴、笙在丧礼里不是配乐，而是把一场私痛写成可被天地听见的秩序。",
    note: "三器落位，乐才成礼。",
  },
  "offering-rite": {
    id: "offering-rite",
    title: "祭祀之礼",
    position: "黄昏 · 祭席",
    symbol: "酒谷肉果",
    body: "祭品并非简单供奉食物，而是人与祖先关系的表达。酒、谷物、肉类与水果各有其位，桌面即人间尚未切断的那一桌。",
    note: "摆正了，才是给祖先的席。",
  },
  "han-feast": {
    id: "han-feast",
    title: "汉代音乐与饮食文化",
    position: "黄昏 · 乐食",
    symbol: "以乐侑食，事死如生",
    body: "汉代贵族宴饮讲究“以乐侑食”，烹饪方式已有炙、熬、鲊、羹等。马王堆汉墓出土遣册与器物显示，辛追墓中随葬有食物、酒器与乐器，体现“事死如生”的观念。杨树达《汉代丧葬制度考》载，从葬之物有黍、稷、稻、梁，瓦杯酒樽，以及钟、磬、琴、瑟。T形帛画人间部分绘鼎、壶、酒食器具及祭祀宴饮场景，正是这一文化的图像呈现。",
    note: "乐与食同在席上，生与死共用一礼。",
  },
  "fei-yi": {
    id: "fei-yi",
    title: "T形帛画 · 非衣",
    position: "全画 · 引魂升天",
    symbol: "张举引魂，覆棺为衣",
    body: "T形帛画又称“非衣”，出殡时张举引魂，入葬时覆盖内棺。全画分天上、人间、地下三部分，主题为“引魂升天”。人间绘墓主辛追拄杖前行，天界有帝阍守门、烛龙端坐，地下有禺疆托地。汉代人相信魂升天、魄入地，帛画即死后旅程图，呈现天地结构、灵魂升天及汉代死后世界想象。",
    note: "你走过的路，原是覆在棺上的一件衣。",
  },
  yujiang: {
    id: "yujiang",
    title: "力士／禺疆",
    position: "下段 · 神人与北海之神",
    symbol: "托地之力，一说风神",
    body: "马王堆帛画下部常见神人、灵芝与水族。力士一类形象或托举、或御兽，把地下世界的重量画成人的肩背。禺疆（亦作禺强）见于《山海经》，为北海之神，人面鸟身，耳两青蛇，践两青蛇，一说即风神。学者常将帛画地界的神怪与这一神谱对读：地底不是废墟，而是有神在维持的秩序。",
    note: "看见整个人间，是因为有神把地托了起来。",
  },
  jingni: {
    id: "jingni",
    title: "鲸鲵",
    position: "下段 · 交尾鲸鲵",
    symbol: "地界水族，一说托地负阴",
    body: "马王堆帛画最下层常见巨大水族缠绕，学者多读作鲸鲵。它们不是路过的装饰，而是把地下世界的重量画成鳞与脊：交尾、翻涌，对应人间的一次轮回。力士托举的，正是这片尚未安定的水府。",
    note: "向下望去鲸鲵交尾，一次翻涌又是人间一次轮回。",
  },
  xinzhui: {
    id: "xinzhui",
    title: "辛追夫人｜汉代的永生想象",
    position: "上段 · 双龙天门",
    symbol: "帛画中的墓主",
    body: "两千年前，一位名叫辛追的汉代贵族夫人长眠于地下。她的墓中发现了一幅神秘帛画——你正在走过的，正是这幅帛画中的升天之路。",
    note: "你正在走过的，正是这幅帛画中的升天之路。",
  },
  maid: {
    id: "maid",
    title: "侍女",
    position: "上段 · 双龙天门",
    symbol: "随行升天",
    body: "侍女随夫人走在升天路上。汉代贵族的仙界想象里，随从仍在身侧，人间的身份并未在门前被抹去。",
    note: "她跟在夫人身侧，并不看你。",
  },
  jumang: {
    id: "jumang",
    title: "句芒鸟",
    position: "中上 · 句芒鸟",
    symbol: "象征生命的神鸟",
    body: "帛画中上段的人面鸟，学者一说即句芒：东方之神，主春、主生。《礼记·月令》以句芒为春神，木德，万物由此发生。它在升天路上不是拦路的精怪，而是生命仍在循环的征象——听它，是把生机接回身上。",
    note: "象征生命的神鸟。听懂之前，先把声音留下。",
  },
  bribery: {
    id: "bribery",
    title: "汉代官员贪污与受贿",
    position: "上段 · 双龙天门",
    symbol: "以物通关，以礼换路",
    body: "汉代官僚体系中，门籍、谒见与关传常需「执贽」「奉献」。文献与简牍多见吏人以财货疏通关节；帛画天门两侧的使者，亦被学者读作人间门吏的天上投影。献簪换带路，不是戏谑，而是把「通行依赖人情与贿礼」画进升天仪式。",
    note: "发簪一递，路就轻了——天上也认得人间的规矩。",
  },
  feilian: {
    id: "feilian",
    title: "飞廉",
    position: "天界入口 · 飞廉",
    symbol: "招魂鸟，接引亡者",
    body: "飞廉一作风伯，汉画与帛画语境中常作神禽，与招魂、导引相关。马王堆升天图上段神鸟有多种定名；飞廉一说强调其「接引亡魂」的职能——不是拦路，而是把魂送向该去的地方。",
    note: "路过飞廉，即被接引了一程。",
  },
  gate: {
    id: "gate",
    title: "帝阍",
    position: "上段 · 天门门阙",
    symbol: "天界的守门人，秩序的门槛",
    body: "天门两侧有守门者，或即帝阍。汉人把人间的门籍、谒见，投射到天上：升仙也要通报、行礼，天界同样有官僚。",
    note: "进门靠礼仪，不靠闯。",
  },
  sun: {
    id: "sun",
    title: "日乌与扶桑",
    position: "上段右侧 · 太阳",
    symbol: "日中金乌，扶桑为栖",
    body: "帛画上部常画太阳，中有金乌；近处或有扶桑一类神树。日从东方升起，是天界时间的起点，也是生命循环的另一半。",
    note: "天界先用「日」来标明方向。",
  },
  moon: {
    id: "moon",
    title: "月蟾玉兔",
    position: "上段左侧 · 月亮",
    symbol: "月中蟾蜍，间绘玉兔",
    body: "月与日对位。蟾蜍、玉兔是汉画里常见的月中物，和不死、阴、水相关。天界不是空的亮光，而是被神话填满的空间。",
    note: "日月成对，才成宇宙。",
  },
};

const XUANWU_LINES = [
  { speaker: "旁白", text: "你感觉周身被潮水包裹，来时的路又一次不见了踪影。" },
  {
    speaker: "旁白",
    text: "在这你以为不会有活物的虚无之中，一只玄武从暗处走来，四足踏雾，嘴里衔着一株灵芝，那是这里唯一清透的光亮。",
  },
  { speaker: "旁白", text: "玄武在你面前停下。口中灵芝轻轻闪烁。点那一点光，接过或推开。" },
];

const XUANWU_LINGZHI_HOTSPOT = {
  id: "lingzhi-offer",
  label: "灵芝",
  hidden: true,
  reply: "灵芝落在你掌心，还带着一点潮气与光。",
  action: { type: "fork", title: "衔芝", delay: 280 },
  paths: null,
};

const XUANWU_PATHS = [
  {
    id: "eat",
    kind: "eat",
    text: "服下灵芝，也许是生门",
    next: "lishi",
    flag: "ateLingzhi",
    grantMemory: "lingzhi-power",
    veilOverride: "一股暖流顺着咽喉滑入身体，你感受到一股力量暗暗抵御这黑暗的侵蚀，你得以将周遭一切看得更加清晰。",
  },
  {
    id: "refuse",
    kind: "refuse",
    text: "来路不明，还是谨慎",
    next: "no_medicine",
    flag: "refusedLingzhi",
  },
];
XUANWU_LINGZHI_HOTSPOT.paths = XUANWU_PATHS;

const GATE_ARRIVE_VEIL = "双龙之路终于抵达尽头。云雾散开，一座高大的天门出现在眼前。";

const GATE_ENVOY_PATHS = [
  {
    id: "offer-pin",
    kind: "offer",
    text: "拔下发簪递上，身外之物",
    next: "heaven_gate",
    flag: "choice:bribe",
    unsetFlags: ["choice:ignore"],
    grantMemory: "bribe-path",
    veilOverride: GATE_ARRIVE_VEIL,
  },
  {
    id: "ignore",
    kind: "refuse",
    text: "生前为此左右，死后才不受这气",
    next: "heaven_gate",
    flag: "choice:ignore",
    unsetFlags: ["choice:bribe"],
    veilOverride: ["使者白了你一眼，转身向前走去。", GATE_ARRIVE_VEIL],
  },
];

const GATE_SELF_SPEAK = {
  id: "self-speak",
  kind: "refuse",
  text: "自行上前说明",
  next: "uninvited",
  flag: "choice:uninvited",
  veilOverride: "守卫沉默许久。并不准备一个亡魂的辩解。",
};

const GATE_OPEN_VEIL = [
  "使者替你说明来意，守卫缓缓退开。",
  "你明白：\n天界并非逃离规则的地方，\n而是另一种秩序的延续。",
  "天门缓缓开启。\n你没有回头。\n生者归于人间，\n亡者继续前行。",
];

function heavenGateForkPaths(state) {
  const bribed = state.flags.has("choice:bribe");
  return [
    bribed
      ? {
          id: "ask-envoy",
          kind: "offer",
          text: "请使者引荐",
          next: "heaven_world",
          flag: "choice:recommend",
          veilOverride: GATE_OPEN_VEIL,
        }
      : {
          id: "ask-envoy",
          kind: "offer",
          text: "请使者引荐",
          stay: true,
          stayText: "使者冷哼一声站在旁边，不予理睬。",
          thenPaths: [GATE_SELF_SPEAK],
        },
    GATE_SELF_SPEAK,
  ];
}

const JUMANG_BIRDS = [
  { id: "bird", outline: { x: 23.4, y: 43.6, w: 30, h: 26, radius: "42%" }, faintGlow: true, frontGlow: true },
  { id: "bird-mate", outline: { x: 76.6, y: 43.6, w: 30, h: 26, radius: "42%" }, faintGlow: true, frontGlow: true },
  { id: "bird-crown", outline: { x: 50, y: 18.2, w: 18, h: 28, radius: "50%" } },
];

const JUMANG_FORK_PATHS = [
  {
    id: "listen",
    kind: "listen",
    text: "漫漫长路有人作伴，也不一定是人",
    next: "gate",
    flag: "choice:listen",
    unsetFlags: ["choice:attack"],
    grantMemory: "jumang-faith",
    veilOverride: [
      "当你平静下来之后，竟然好像听懂了神鸟的语言，像是春日的清风拂去满身的疲惫，你感觉又恢复了活力，你跟随着句芒的歌声舞动，感受着生命的力量。",
    ],
  },
  {
    id: "kill",
    kind: "kill",
    text: "呕哑嘲哳，管你神兽我掐死你",
    next: "jumang_wither",
    flag: "choice:attack",
    unsetFlags: ["choice:listen"],
    inkDrown: true,
    inkPages: [
      "句芒歌声停止的刹那，你感觉自己变成了一朵骤然枯萎的花，皮肤如波浪般卷起皱纹，浑身上下失去力气瘫软在地。",
      "这是生命的力量，这是不敬畏生命的代价。",
    ],
    inkFinale: "获得结局：不敬生灵",
  },
];

const SCENES = {
  title: {
    id: "title",
    title: "封面",
    type: "title",
    bg: "assets/bg/title-sun-moon.jpg",
    heading: "升天图",
    subtitle: "一场穿越汉代宇宙观的亡魂旅程",
    startLabel: "展卷",
    startScene: "mortal",
    pan: false,
    lines: [],
    hotspots: [],
    choices: [],
  },

  mortal: {
    id: "mortal",
    title: "人间 · 苏醒",
    type: "story",
    bg: "assets/bg/feast.jpg",
    pan: false,
    tone: "feast",
    transitionIn: [
      "唤醒你的不是规律起搏的心跳，是痛彻心扉的哭喊和悲怆哀惋的奏乐。你还要轻抚胸口几次才能确定你已经真的死了？",
      "钟鼓齐鸣，琴瑟交织，眼前亲朋的哀恸绝对真实。",
    ],
    bannerCall:
      "不知自何处起的微风撩动你的发梢，引得你回头望去，大门敞开，竹竿支起的幡帛无风自动，像是在招手，指引你走上似乎正确的道路。",
    bannerCallLines: [
      "不知自何处起的微风撩动你的发梢，\n引得你回头望去，大门敞开。",
      "竹竿支起的幡帛无风自动，像是在招手，\n指引你走上似乎正确的道路。",
    ],
    lines: [
      { speaker: "旁白", text: "点击画面中的宴乐人物与案上酒食，解锁相关图鉴。" },
    ],
    hotspots: [
      {
        id: "crying",
        label: "哭丧",
        outline: { x: 14.8, y: 42, w: 22, h: 34, radius: "10%" },
        fx: "weep",
        reply: "坐着的人并不喧闹。谁先哭、谁后静，都写在这一席里。",
        action: { type: "knowledge", cardId: "crying", memoryId: "earthly" },
      },
      {
        id: "music",
        label: "哀乐",
        outline: { x: 86.2, y: 40.5, w: 20, h: 34, radius: "10%" },
        fx: "chime",
        reply: "乐不在手里。它在席的规矩里，规定谁该哭、谁该静。",
        action: { type: "knowledge", cardId: "music", memoryId: "ritual-music" },
      },
      {
        id: "feast-wine",
        label: "酒壶",
        outline: { x: 36.2, y: 45.2, w: 14.2, h: 15.2, radius: "46%" },
        fx: "feast",
        reply: "两只陶壶对坐。酒是给死者留下的那一份。",
        action: { type: "knowledge", cardId: "offering", memoryId: "offering-memory" },
      },
      {
        id: "feast-platter",
        label: "炙盘",
        outline: { x: 53.4, y: 43.8, w: 13.6, h: 8.4, radius: "42%" },
        fx: "feast",
        reply: "长盘上是炙过的食。香气还停在画里。",
        action: { type: "knowledge", cardId: "offering", memoryId: "offering-memory" },
      },
      {
        id: "feast-ding",
        label: "鼎",
        outline: { x: 67.2, y: 40.6, w: 16.4, h: 16.8, radius: "46%" },
        fx: "feast",
        reply: "鼎里的气味还热着，像有人刚把你的一份留下。",
        action: { type: "knowledge", cardId: "offering", memoryId: "offering-memory" },
      },
      {
        id: "feast-bun",
        label: "饼饵",
        outline: { x: 36.4, y: 59.6, w: 8.8, h: 9.2, radius: "50%" },
        fx: "feast",
        reply: "案上那枚白的，是饼饵。麦食也要上给亡者。",
        action: { type: "knowledge", cardId: "offering", memoryId: "offering-memory" },
      },
      {
        id: "feast-dou",
        label: "豆",
        outline: { x: 44.2, y: 59.2, w: 8.4, h: 10, radius: "48%" },
        fx: "feast",
        reply: "高足豆承着祭实。豆，是席上最端正的那一件。",
        action: { type: "knowledge", cardId: "offering", memoryId: "offering-memory" },
      },
      {
        id: "feast-stew",
        label: "羹",
        outline: { x: 59.6, y: 59.4, w: 9.2, h: 9.4, radius: "48%" },
        fx: "feast",
        reply: "碗里是羹。热气散了，礼还在。",
        action: { type: "knowledge", cardId: "offering", memoryId: "offering-memory" },
      },
      {
        id: "banner",
        label: "神秘幡帛",
        x: 88,
        y: 24,
        icon: "assets/icon/banner.png?v=t-banner1",
        actor: true,
        hiddenUntilSummon: true,
        fx: "ink",
        reply: "幡比名字先碰到你：它来招魂，也来引路。",
        action: { type: "knowledge", cardId: "banner", memoryId: "shore" },
      },
    ],
    paths: [
      {
        id: "stay-human",
        kind: "lantern",
        text: "钟鼓佳肴，流连人间",
        next: "nameless",
        flag: "path:human",
        inkDrown: true,
        inkPages: [
          "宴席总有散去的一天，活着的人们会因为其他理由重聚享受欢愉，只是这一切不再与你有关。",
          "当最后一个记得你的人带着岁月与风霜长眠，你的存在被一同埋葬。只剩下没有意义的一缕亡魂，在以永恒为单位的度量衡里承受着被遗忘的凌迟。",
        ],
        inkFinale: "获得结局：无名游魂",
      },
      {
        id: "follow-banner",
        kind: "banner",
        text: "遵从感应，去灵魂栖所",
        next: "dragons",
        drift: true,
        flag: "path:heaven",
        incomplete: true,
        veilOverride: "幡帛在你追出门的那一刻消失，你惊觉脚下是一张一合的龙鳞，向下望去是看不见地面形状的万丈高空。",
      },
    ],
  },

  human_culture: {
    id: "human_culture",
    title: "人间 · 黄昏",
    type: "ritual",
    bg: "assets/bg/feast.jpg",
    pan: false,
    tone: "feast",
    transitionIn: "你没有立刻跟着走。席还在，案上的酒食像刚摆上。",
    lines: [
      { speaker: "旁白", text: "黄昏的祭席没有散。酒壶、炙盘、鼎、饼、豆、羹都还在原处。" },
      { speaker: "亡魂", text: "再点一遍席上的器物，把这一桌叫出名字。" },
    ],
    hotspots: [
      {
        id: "music-mess",
        label: "礼乐",
        x: 8.5,
        y: 18,
        icon: "assets/icon/chime.svg",
        station: true,
        hint: true,
        scatter: [
          { icon: "assets/icon/chime.svg", dx: -18, dy: 8, rot: -18 },
          { icon: "assets/icon/qin.svg", dx: 16, dy: -10, rot: 20 },
          { icon: "assets/icon/sheng.svg", dx: 2, dy: 16, rot: -8 },
        ],
        action: { type: "rite", riteId: "music-rite" },
      },
      {
        id: "feast-wine",
        label: "酒壶",
        outline: { x: 36.2, y: 45.2, w: 14.2, h: 15.2, radius: "46%" },
        reply: "两只陶壶对坐。酒是给死者留下的那一份。",
        action: { type: "trace", riteId: "altar-rite", pieceId: "wine" },
      },
      {
        id: "feast-platter",
        label: "炙盘",
        outline: { x: 53.4, y: 43.8, w: 13.6, h: 8.4, radius: "42%" },
        reply: "长盘上是炙过的食。香气还停在画里。",
        action: { type: "trace", riteId: "altar-rite", pieceId: "roast" },
      },
      {
        id: "feast-ding",
        label: "鼎",
        outline: { x: 67.2, y: 40.6, w: 16.4, h: 16.8, radius: "46%" },
        reply: "大鼎居席。牲肉与羹在这一器里成礼。",
        action: { type: "trace", riteId: "altar-rite", pieceId: "ding" },
      },
      {
        id: "feast-bun",
        label: "饼饵",
        outline: { x: 36.4, y: 59.6, w: 8.8, h: 9.2, radius: "50%" },
        reply: "案上那枚白的，是饼饵。麦食也要上给亡者。",
        action: { type: "trace", riteId: "altar-rite", pieceId: "cake" },
      },
      {
        id: "feast-dou",
        label: "豆",
        outline: { x: 44.2, y: 59.2, w: 8.4, h: 10, radius: "48%" },
        reply: "高足豆承着祭实。豆，是席上最端正的那一件。",
        action: { type: "trace", riteId: "altar-rite", pieceId: "dou" },
      },
      {
        id: "feast-stew",
        label: "羹",
        outline: { x: 59.6, y: 59.4, w: 9.2, h: 9.4, radius: "48%" },
        reply: "碗里是羹。热气散了，礼还在。",
        action: { type: "trace", riteId: "altar-rite", pieceId: "stew" },
      },
    ],
    rites: [
      {
        id: "music-rite",
        kind: "listen",
        title: "祭祀乐器",
        hint: "点编钟、琴、笙，听一听席上的乐。",
        complete: "三器都响过了。乐还停在黄昏里。",
      },
      {
        id: "altar-rite",
        kind: "trace",
        title: "祭品上供",
        hint: "点席上的酒壶、炙盘、鼎、饼饵、豆与羹。",
        complete: "席上的酒食都叫过名了。这一桌还热着。",
      },
    ],
    nightLines: [
      { speaker: "旁白", text: "你已经听懂了人间的告别。" },
      { speaker: "旁白", text: "现在，是时候继续前往彼岸。" },
    ],
    paths: [
      {
        id: "night-follow",
        kind: "banner",
        text: "跟随幡帛",
        next: "dragons",
        drift: true,
        flag: "memory:complete",
      },
    ],
  },

  nameless: {
    id: "nameless",
    title: "结局 · 无名游魂",
    type: "ending",
    endingKind: "nameless",
    endingCard: true,
    endingTitle: "获得结局",
    endingName: "无名游魂",
    endingLine: "获得结局：无名游魂",
    homeNode: "mortal",
    bg: "",
    pan: false,
    tone: "void",
    lines: [],
    hotspots: [],
    paths: [
      {
        id: "back-home",
        kind: "refuse",
        text: "回到卷首",
        next: "title",
      },
    ],
    endings: {
      default: "",
    },
  },

  dragons: {
    id: "dragons",
    title: "中段 · 双龙",
    type: "story",
    bg: "assets/bg/dragons.jpg",
    pan: false,
    fit: "cover",
    hideEndCue: true,
    transitionIn: "幡帛在你追出门的那一刻消失，你惊觉脚下是一张一合的龙鳞，向下望去是看不见地面形状的万丈高空。",
    lines: (state) =>
      state.flags.has("faintedOnce")
        ? [
            { speaker: "旁白", text: "你又站在交龙之间。向前仍是云层里那一线光，向后仍是摇摆的龙尾。" },
            { speaker: "旁白", text: "中间的玉璧似乎在闪烁。" },
          ]
        : [
            {
              speaker: "旁白",
              text: "向前望去一青一红两条巨龙缠绕着飞向云层翻涌的视线尽头，那里似乎有一线微弱的光亮；",
            },
            {
              speaker: "旁白",
              text: "向后看去隐约可见摇摆的龙尾，大门、院落、亲朋好友、宴乐佳肴，你熟悉的一切全都消失不见，只留下两位一问三不知的侍从。似乎已经没有回头路可言了。",
            },
            { speaker: "旁白", text: "中间的玉璧似乎在闪烁。" },
          ],
    hotspots: [
      {
        id: "mid-glow",
        label: "交龙玉璧",
        x: 50,
        y: 47.6,
        faintGlow: true,
        biDisc: true,
        reply: "中间的玉璧似乎在闪烁。",
        action: { type: "fork", delay: 180 },
        paths: [
          {
            id: "tail",
            kind: "tail",
            text: "踉跄回头，想回到熟悉的地方",
            next: "ghost_world",
            flag: "path:ghost",
          },
          {
            id: "forward",
            kind: "forward",
            text: "既已向前，便不再回头",
            next: "spirit",
            flag: "path:forward",
            veilOverride: [
              "看起来近在咫尺的目标走起来却好像没有尽头，你的步履逐渐迟缓，呼吸逐渐沉重。",
              "就在快要坐下的时候听见一阵奇异的声音，那声音似歌唱又似鸟鸣。",
            ],
          },
        ],
      },
    ],
  },

  ghost_world: {
    id: "ghost_world",
    title: "鬼域 · 玄武",
    type: "story",
    bg: "assets/bg/xuanwu-paper.jpg",
    pan: false,
    skipDim: true,
    xuanwuWalk: true,
    hideEndCue: true,
    transitionIn:
      "不知什么时候开始天色暗了下来，轻盈的天空在不知不觉中变成了暗流涌动的混沌，你将双手在眼前展开，确定一切真实存在，却又好像遥不可及。",
    lines: XUANWU_LINES,
    hotspots: [XUANWU_LINGZHI_HOTSPOT],
    paths: XUANWU_PATHS,
  },

  lingzhi: {
    id: "lingzhi",
    title: "鬼域 · 灵芝",
    type: "story",
    bg: "assets/bg/xuanwu-paper.jpg",
    pan: false,
    skipDim: true,
    xuanwuWalk: true,
    hideEndCue: true,
    transitionIn:
      "不知什么时候开始天色暗了下来，轻盈的天空在不知不觉中变成了暗流涌动的混沌，你将双手在眼前展开，确定一切真实存在，却又好像遥不可及。",
    lines: XUANWU_LINES,
    hotspots: [XUANWU_LINGZHI_HOTSPOT],
    paths: XUANWU_PATHS,
  },

  no_medicine: {
    id: "no_medicine",
    title: "结局 · 有病不吃药的来",
    type: "ending",
    endingKind: "no-medicine",
    endingCard: true,
    endingTitle: "结局二",
    endingName: "有病不吃药的来",
    endingLine: "结局二：有病不吃药的来",
    homeNode: "dragons",
    bg: "",
    pan: false,
    tone: "void",
    lines: [],
    hotspots: [],
    transitionIn:
      "此前没有察觉到的被暗流吞没般的窒息感此刻如猛兽般席卷而来，黑暗终究吞没了你最后一缕神识，这个你甚至没来得及弄清的世界成了你的葬身之地。",
    paths: [
      {
        id: "back-home",
        kind: "refuse",
        text: "回到卷首",
        next: "title",
      },
    ],
    endings: {
      default: "",
    },
  },

  lishi: {
    id: "lishi",
    title: "鬼域 · 力士",
    type: "story",
    bg: "assets/bg/lishi.jpg",
    pan: false,
    skipDim: true,
    hideEndCue: true,
    transitionIn: "一股暖流顺着咽喉滑入身体，你感受到一股力量暗暗抵御这黑暗的侵蚀，你得以将周遭一切看得更加清晰。",
    lines: [
      {
        speaker: "旁白",
        text: "玄武缓缓游走。烟云散开处，上方有力士咬牙托着横木，身下鲸鲵交缠，持灯的亡魂绕成一圈。",
      },
      { speaker: "旁白", text: "力士抬眼盯着你，缓缓开口求助。点画面上方托梁的那一位。" },
    ],
    hotspots: [
      {
        id: "lishi",
        label: "力士",
        faintGlow: true,
        outline: { x: 50, y: 13.5, w: 22, h: 26, radius: "18%" },
        reply: "横木压在肩上。他等你决定，要不要把这重量分走一点。",
        action: { type: "fork", delay: 180 },
        paths: [
          {
            id: "help",
            kind: "help",
            text: "力量无处释放，慷慨应下",
            next: "abyss",
            flag: "helpedLishi",
            veilOverride:
              "力士移动乾坤你才发现他身上托举的是整个人间，这绝非你能承受的重量，你终于知道此刻你正深处阴界，肩上的重担是你轻易许诺的代价，你陷入等待下一个迷途之人的轮回。",
          },
          {
            id: "nohelp",
            kind: "avoid",
            text: "多一事不如少一事，走开",
            next: "abyss",
            flag: "refusedLishi",
            veilOverride: [
              "力士嗔怒地望着你，转瞬露出嘲弄似的笑容，你正疑惑笑容的含义，差点一脚踩空，向下望去鲸鲵交尾，一次翻涌又是人间一次轮回。",
              "你终于明白，结局在你试图回头的瞬间就已经注定。亡魂之路从来只是单行线，释怀的人到达彼岸，后悔的人坠入深渊。",
            ],
          },
        ],
      },
      {
        id: "jingni",
        label: "鲸鲵",
        outline: { x: 50, y: 44, w: 40, h: 28, radius: "42%" },
        reply: "两尾相绞，把地底的水府缠成一团。",
        action: { type: "knowledge", cardId: "jingni" },
      },
    ],
  },

  abyss: {
    id: "abyss",
    title: "结局 · 永堕深渊",
    type: "ending",
    endingKind: "abyss",
    endingCard: true,
    endingTitle: "结局三",
    endingName: "永堕深渊",
    endingLine: "结局三：永堕深渊",
    homeNode: "dragons",
    bg: "",
    pan: false,
    tone: "void",
    lines: [],
    hotspots: [],
    transitionIn: "你陷入等待下一个迷途之人的轮回。",
    paths: [
      {
        id: "back-home",
        kind: "refuse",
        text: "回到卷首",
        next: "title",
      },
    ],
    endings: {
      default: "",
    },
  },

  ghost_trap: {
    id: "ghost_trap",
    title: "永困 · 鬼怪世界",
    type: "ending",
    endingKind: "trap",
    bg: "assets/bg/ghost-trap.svg",
    pan: false,
    tone: "ghost",
    grantMemory: "trapped-ghost",
    transitionIn: "缠绕收紧。升天之路在这里断了。",
    lines: [],
    hotspots: [],
    paths: [
      {
        id: "back-home",
        kind: "refuse",
        text: "回到卷首",
        next: "title",
      },
    ],
    endings: {
      default:
        "你被留在龙尾之下。帛画下段的鬼怪世界不是路过的景，是一张网。鲸鲵仍在缠，力士仍在托地，灵芝的热力已经冷了。",
    },
  },

  spirit: {
    id: "spirit",
    title: "中上 · 句芒鸟",
    type: "story",
    bg: "assets/bg/spirit.jpg",
    pan: false,
    hideEndCue: true,
    homeNode: "spirit",
    skipDim: true,
    transitionIn: "就在快要坐下的时候听见一阵奇异的声音，那声音似歌唱又似鸟鸣。",
    lines: [
      {
        speaker: "旁白",
        text: "一抬头一只人首鸟身的怪物遮住了你的视线，从空中缓缓落下，它就是那个奇怪声音的源头。",
      },
      { speaker: "亡魂", text: "你向前走去，试图与他交流。" },
    ],
    hotspots: JUMANG_BIRDS.map((bird) => ({
      ...bird,
      label: "句芒鸟",
      reply: "歌声还停在空中。点它，路才会分开。",
      action: { type: "fork", title: "它还在说", delay: 220 },
      paths: JUMANG_FORK_PATHS,
    })),
  },

  jumang_listen: {
    id: "jumang_listen",
    title: "中上 · 句芒鸟",
    type: "story",
    bg: "assets/bg/spirit.jpg",
    pan: false,
    hideEndCue: true,
    homeNode: "spirit",
    autoKnowledge: "bird",
    transitionIn: "你没有伸手。只把那串听不懂的声音留下。",
    lines: [
      { speaker: "旁白", text: "叽叽喳喳渐渐变了。声音越来越好听。" },
      { speaker: "亡魂", text: "生命能量涌进来，像春气从四肢回到胸口。" },
      { speaker: "亡魂", text: "你忽然生出信心：这条路，能走到尽头。" },
    ],
    hotspots: JUMANG_BIRDS.map((bird) => ({
      ...bird,
      label: "句芒鸟",
      reply: "原来它一直在说生。",
      action: { type: "knowledge", cardId: "jumang", memoryId: "jumang-faith" },
    })),
    afterCollect: {
      cardId: "jumang",
      forkTitle: "生机还在",
      paths: [
        {
          id: "to-gate",
          kind: "forward",
          text: "继续剧情",
          next: "gate",
        },
      ],
    },
  },

  jumang_wither: {
    id: "jumang_wither",
    title: "结局 · 不敬生灵",
    type: "ending",
    endingKind: "wither",
    endingCard: true,
    endingTitle: "获得结局",
    endingName: "不敬生灵",
    endingLine: "获得结局：不敬生灵",
    homeNode: "spirit",
    bg: "",
    pan: false,
    tone: "void",
    grantMemory: "jumang-wither",
    lines: [],
    hotspots: [],
    paths: [
      {
        id: "back-home",
        kind: "refuse",
        text: "回到卷首",
        next: "title",
      },
    ],
    endings: {
      default: "",
    },
  },

  gate: {
    id: "gate",
    title: "上段 · 双龙天门",
    type: "story",
    bg: "assets/bg/gate-envoys.jpg",
    pan: false,
    hideEndCue: true,
    homeNode: "gate",
    skipDim: true,
    transitionIn: "",
    lines: [
      { speaker: "旁白", text: "你看到面前是辛追夫人和他的侍女，你跟了上去。" },
      {
        speaker: "旁白",
        text: "面前两位恭敬到谄媚的使者已在此等候多时。他们送走夫人后报上了你的名讳和生平，并告诉你他们是引路的使者，可以带你抵达天界。",
      },
      {
        speaker: "旁白",
        text: "使者说话的时候顿了一下，用试探性的眼光瞄了你一眼，你立马领会。天界的使者和人间的官僚也别无二致。",
      },
    ],
    hotspots: [
      {
        id: "envoy-left",
        label: "天界使者",
        outline: { x: 26.8, y: 40.5, w: 11, h: 24, radius: "40%" },
        faintGlow: true,
        frontGlow: true,
        glowTop: "28%",
        reply: "发簪还别在发间。点发光的使者，路才会分开。",
        action: { type: "fork", title: "使者看着你", delay: 220 },
        paths: GATE_ENVOY_PATHS,
      },
      {
        id: "envoy-kneel",
        label: "天界使者",
        outline: { x: 36.0, y: 40.2, w: 10, h: 22, radius: "42%" },
        faintGlow: true,
        frontGlow: true,
        glowTop: "22%",
        reply: "发簪还别在发间。点发光的使者，路才会分开。",
        action: { type: "fork", title: "使者看着你", delay: 220 },
        paths: GATE_ENVOY_PATHS,
      },
      {
        id: "xinzhui",
        label: "辛追夫人",
        outline: { x: 50.2, y: 36, w: 13, h: 36, radius: "28%" },
        reply: "你正在走过的，正是这幅帛画中的升天之路。",
        action: { type: "knowledge", cardId: "xinzhui" },
      },
      {
        id: "maid",
        label: "侍女",
        outline: { x: 66.5, y: 34, w: 15, h: 34, radius: "28%" },
        reply: "她跟在夫人身侧，并不看你。",
        action: { type: "knowledge", cardId: "maid" },
      },
    ],
  },

  heaven_gate: {
    id: "heaven_gate",
    title: "上段 · 天界守门",
    type: "story",
    bg: "assets/bg/heaven-guards.jpg",
    pan: false,
    hideEndCue: true,
    homeNode: "heaven_gate",
    skipDim: true,
    transitionIn: GATE_ARRIVE_VEIL,
    lines: [
      { speaker: "旁白", text: "门前，两名守卫静静伫立。" },
      {
        speaker: "旁白",
        text: "他们守护此处已不知多久，辨认每一个亡魂的身份与来处，决定谁能够进入天界。",
      },
    ],
    hotspots: (state) => [
      {
        id: "guard-left",
        label: "守卫",
        outline: { x: 39, y: 50, w: 17, h: 40, radius: "42%" },
        faintGlow: true,
        frontGlow: true,
        reply: "守卫看向你：“亡者亦有归处，但归处并非人人可至，你是否具备进入天界的资格？”",
        action: { type: "fork", title: "你是否具备进入天界的资格？", delay: 280 },
        paths: heavenGateForkPaths(state),
      },
      {
        id: "guard-right",
        label: "守卫",
        outline: { x: 57.5, y: 50, w: 17, h: 40, radius: "42%" },
        faintGlow: true,
        frontGlow: true,
        reply: "守卫看向你：“亡者亦有归处，但归处并非人人可至，你是否具备进入天界的资格？”",
        action: { type: "fork", title: "你是否具备进入天界的资格？", delay: 280 },
        paths: heavenGateForkPaths(state),
      },
    ],
  },

  uninvited: {
    id: "uninvited",
    title: "结局 · 没被邀",
    type: "ending",
    endingKind: "uninvited",
    endingCard: true,
    endingTitle: "获得结局",
    endingName: "没被邀",
    endingLine: "获得结局：没被邀",
    homeNode: "heaven_gate",
    bg: "",
    pan: false,
    tone: "void",
    lines: [],
    hotspots: [],
    paths: [
      {
        id: "back-home",
        kind: "refuse",
        text: "回到卷首",
        next: "title",
      },
    ],
    endings: {
      default: "",
    },
  },

  heaven_world: {
    id: "heaven_world",
    title: "上段 · 天界",
    type: "story",
    bg: "assets/bg/heaven-world.jpg",
    pan: false,
    hideEndCue: true,
    homeNode: "heaven_world",
    skipDim: true,
    clickNext: "heaven",
    transitionIn: "",
    lines: [
      {
        speaker: "旁白",
        text: "欢迎来到天界，此地上横为天，\n正中人首蛇身之神端坐，五鹤引吭。",
      },
      {
        speaker: "旁白",
        text: "右上赤日，日中有金乌，扶桑九日错落；\n左上银月，月中有蟾蜍玉兔，下有托月女神。",
      },
      {
        speaker: "旁白",
        text: "应龙蜿蜒，神豹守门，帝阍拱立。\n云气流转，神兽翔舞，朱青交映，灿然一宇宙也。",
      },
    ],
    hotspots: [],
  },

  heaven: {
    id: "heaven",
    title: "上段 · 天神",
    type: "story",
    bg: "assets/bg/heaven-god.jpg",
    pan: false,
    hideEndCue: true,
    homeNode: "heaven",
    skipDim: true,
    transitionIn: "",
    lines: [
      { speaker: "旁白", text: "云雾深处，一位人身龙尾的天神出现。" },
      { speaker: "旁白", text: "他向你发问：\n你还记得自己如何来到这里吗？" },
    ],
    recallFinale: true,
    hotspots: [],
  },

  ending: {
    id: "ending",
    title: "终卷 · 画中",
    type: "ending",
    bg: "assets/bg/t-painting.svg",
    pan: false,
    transitionIn: "有人问你是否真的进了天界。画卷被轻轻拉远。",
    lines: [],
    hotspots: [],
    choices: [
      {
        id: "restart",
        text: "回到首页",
        hint: "可继续或重开",
        next: "title",
        reset: false,
        x: 50,
        y: 58,
      },
    ],
    endings: {
      "choice:listen":
        "你经历的旅程，正是古人绘制的升天之路。人面鸟的鸣声还在——一说那是句芒，把春天从地下叫回天上。镜头拉远：天、人、地本在同一幅 T 形帛画上。",
      "choice:attack":
        "你经历的旅程，正是古人绘制的升天之路。句芒鸟曾在手里枯过一次，生命的回声因此薄了一层。镜头拉远：你一直站在马王堆一号墓那幅展开的帛画里。",
      default:
        "你经历的旅程，正是古人绘制的升天之路。镜头拉远，T 形帛画的上中下三段同时出现：天、人、地从来不是三处地方，而是同一张织物。",
      complete:
        "你在席前多停了一会儿，把哭声、礼乐和祭席都听全了。人间的告别因此更完整——升天不是弃绝，是把这一桌礼带上路。",
      incomplete:
        "你几乎立刻跟着幡走了。人间的哭与乐还没收完，记忆里缺了一角。画卷拉远时，席面仍亮着，像有人还在等你回头。",
    },
  },
};

const SCENE_ALIAS = {
  heaven_guard: "heaven_gate",
  gate_road: "heaven_gate",
  gate_loop: "heaven_gate",
  heaven_entry: "heaven_gate",
  feilian: "heaven_gate",
  mortal_view: "lishi",
  tail_end: "lishi",
  whale: "lishi",
};

function getScene(id) {
  const scene = SCENES[SCENE_ALIAS[id] || id];
  if (!scene) throw new Error(`未找到场景：${id}`);
  return scene;
}

function resolveScene(scene, state) {
  const resolved = {
    ...scene,
    lines: typeof scene.lines === "function" ? scene.lines(state) : scene.lines ?? [],
  };
  if (typeof scene.hotspots === "function") resolved.hotspots = scene.hotspots(state);
  if (typeof scene.paths === "function") resolved.paths = scene.paths(state);
  if (typeof scene.autoFork === "function") resolved.autoFork = scene.autoFork(state);
  return resolved;
}

function getCard(id) {
  const card = KNOWLEDGE_CARDS[id];
  if (!card) throw new Error(`未找到知识卡片：${id}`);
  return card;
}

function getMemory(id) {
  return MEMORIES[id] ?? null;
}

function hasCompleteHumanMemory(memories) {
  return HUMAN_COMPLETE.every((id) => memories.has(id));
}

window.STT = {
  GAME_META,
  SCENE_ORDER,
  LEVEL_NODES,
  HUMAN_COMPLETE,
  MEMORIES,
  KNOWLEDGE_CARDS,
  SCENES,
  getScene,
  resolveScene,
  getCard,
  getMemory,
  hasCompleteHumanMemory,
};
})();
