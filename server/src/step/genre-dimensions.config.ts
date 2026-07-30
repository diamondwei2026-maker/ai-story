// ─── 体裁 → 设定维度映射 ──────────────────────────────────────────
// 根据文章简介分析体裁，动态选择第4维度（替代固定"力量体系"）
// 前3个维度（时代背景、地理环境、社会结构）为所有体裁共用

export interface GenreDimension {
  /** 维度 key，供前端 WorldBuilder 识别 */
  key: string;
  /** 前端卡片显示名 */
  label: string;
  /** AI 输出的 ## 标题（sectionHeader） */
  sectionHeader: string;
  /** 模板变量名，对应 setting-generation.md 的 {{dynamicDimensionSection}} */
  promptContent: string;
}

export interface GenreConfig {
  /** 体裁标识 */
  category: string;
  /** 关键字匹配规则 */
  keywords: string[];
  /** 第4维度的完整 prompt（## 标题 + 生成指令） */
  dimension: GenreDimension;
  /** 文化锚定指令，注入到 prompt 的"## 文化锚定"段 */
  culturalOrientation: string;
}

/**
 * 体裁维度定义
 *
 * 每个体裁的第4维度替代了原来固定的"力量体系"，使 AI 只生成该体裁
 * 真正需要的设定内容，避免不必要的修仙/星际倾向。
 */
const GENRE_CONFIGS: GenreConfig[] = [
  // ── 修仙 / 玄幻 / 奇幻 ──────────────────────────────
  {
    category: 'cultivation',
    keywords: [
      '修仙', '玄幻', '修真', '仙侠', '异能', '超能力',
      '灵气', '魔法', '巫师', '修炼', '境界', '斗气',
      '系统流', '系统', '金手指', '异世界', '穿越',
      '武道', '武侠', '高武', '术法', '道法', '宗门',
    ],
    dimension: {
      key: 'power',
      label: '力量体系',
      sectionHeader: '力量体系',
      promptContent: `## 力量体系
先给出力量/能力的核心定义（一句话），用 **术语** 加粗能力名称。
然后分点展开：
1. **触发条件**：列表列出激活/使用的条件
2. **规则与限制**：逐条列表（\`- \`），每条阐明一项规则或约束
3. **代价与副作用**：简述使用能力需要付出的代价
4. **核心矛盾/破局关键**：简述该体系内置的哲学矛盾或突破点`,
    },
    culturalOrientation: `本作为东方仙侠/玄幻文化背景。世界观设定须植根于中国传统文化与神话体系：
- 地名使用中式仙侠地名（XX山/XX宗/XX域/XX秘境/XX洞天）
- 势力使用中式宗门命名（XX宗/XX派/XX殿/XX阁/XX门）
- 功法、境界、法宝命名使用中式术语，禁止音译外来词
- 建筑美学为中式风格（宫殿/洞府/仙阁/竹楼）
- 禁止出现西方奇幻元素（西方龙、精灵、矮人、魔法塔、巫师帽、骑士团等）`,
  },

  // ── 科幻 / 星际 / 末世 ──────────────────────────────
  {
    category: 'scifi',
    keywords: [
      '星际', '科幻', '末世', '机甲', '赛博', '废土',
      '太空', '宇宙', '外星', 'AI', '人工智能',
      '基因', '改造', '纳米', '虚拟现实', 'VR',
      '末日', '丧尸', '变异', '辐射', '蒸汽朋克',
      '赛博朋克', '机械', '仿生', '机器人',
    ],
    dimension: {
      key: 'tech',
      label: '科技体系',
      sectionHeader: '科技体系',
      promptContent: `## 科技体系
先给出核心科技/规则的定义（一句话），用 **术语** 加粗核心技术名称。
然后分点展开：
1. **科技层级与分布**：逐条列表（\`- \`）列出该世界关键科技及其掌握者/获取难度
2. **核心资源/能源**：简述驱动科技的基础资源及稀缺性
3. **技术限制与伦理边界**：逐条列表阐明技术使用的硬限制与社会禁忌
4. **科技与社会的互动**：简述该体系如何塑造阶级、战争或日常生活`,
    },
    culturalOrientation: `本作为科幻背景。科技与文明设定可从多元文化中汲取灵感，不束缚于特定现实文化。
如用户创意中提及东方文化要素（中式地名、中式制度），须在设定中融入并保持一致性。`,
  },

  // ── 古代 / 历史 / 权谋 / 宅斗 / 武侠 ──────────────────
  {
    category: 'historical',
    keywords: [
      '古代', '历史', '宫斗', '权谋', '江湖', '朝廷',
      '科举', '王府', '嫡女', '庶女', '宅斗', '种田',
      '架空历史', '王朝', '后宫', '谋士', '将军',
      '世家', '门阀', '士族', '寒门', '商贾',
      '武侠', '江湖恩怨', '门派', '侠客', '古风',
      '群像', '基建', '朝堂', '革新', '改制',
    ],
    dimension: {
      key: 'class',
      label: '阶级体系',
      sectionHeader: '阶级体系',
      promptContent: `## 阶级体系
先给出该社会的核心分层逻辑（一句话），用 **术语** 加粗核心制度/规则名称。
然后分点展开：
1. **社会阶层划分**：逐条列表（\`- \`）每个阶层及其特征（出身、权力范围、经济基础）
2. **上升/下沉规则**：简述阶层流动的合法途径与潜规则（如科举、军功、联姻、商路）
3. **礼法制度与禁忌**：逐条列出该社会核心的行为规范、等级礼仪及违背后的代价
4. **核心矛盾/变革张力**：简述该阶级体系自身的内在不稳定因素或历史变革方向`,
    },
    culturalOrientation: `所有设定要素必须严格遵循东方古代文化背景：
- 地名体系：中式地名（XX城/XX州/XX郡/XX县/XX关/XX谷；XX山/XX河/XX江/XX湖），禁止出现西方地名风格
- 势力/机构命名：使用中式官署与组织名称（朝廷/六部/内阁/翰林院/国子监/都察院；世家/门阀/宗族；书院/私塾；商会/钱庄/工坊/镖局；江湖门派）
- 社会制度：参考中国古代体系（皇帝-宰辅-六部-省州府县体系；科举取士/恩荫/捐纳/军功封爵；士农工商四民结构）
- 建筑服饰美学：中式建筑（宫殿/府邸/市坊/园林/民居）；汉服体系（深衣/袍衫/襦裙/褂子）；中式礼仪（揖礼/跪拜礼/稽首礼）
- 纪年方式：使用朝代+年号纪年（如"大雍永和十二年"），禁止公历/大陆历/神历等非中式纪年
- 如创意涉及技术革新（蒸汽/机械/电力），命名须使用中式风格（如"机关术""格物学""火轮车""鸢翼机""轨辙路"），禁止"steampunk""engine""gear"等西式术语直译
- 绝对禁止出现以下元素：西方中世纪城堡、骑士/骑士团、魔法师/巫师/炼金术士、精灵/矮人/兽人/哥布林、教会/教皇/主教/修道院、议会/议会制/总督/殖民地`,
  },

  // ── 现代 / 都市 / 职场 / 校园 / 现实 ──────────────────
  {
    category: 'modern',
    keywords: [
      '都市', '职场', '校园', '现实', '官场', '商战',
      '现代', '当代', '重生', '逆袭', '创业',
      '娱乐圈', '明星', '电竞', '直播', '网红',
      '医疗', '美食', '经营', '日常',
    ],
    dimension: {
      key: 'social',
      label: '社会阶层',
      sectionHeader: '社会阶层',
      promptContent: `## 社会阶层
先给出该社会/圈子的核心分层与运行规则（一句话），用 **术语** 加粗核心制度或资源名。
然后分点展开：
1. **阶层/圈层划分**：逐条列表（\`- \`）各阶层/圈子的特征、准入门槛与话语权
2. **核心资源与获取方式**：简述该社会中决定地位的资源（金钱、人脉、学历、流量等）及其获取路径
3. **潜规则与生存法则**：逐条列出圈内不成文的规则、人情世故与灰色地带
4. **阶层冲突/上升困境**：简述该结构内生的矛盾或主角面临的结构性障碍`,
    },
    culturalOrientation: `本作为当代中国都市背景。世界观设定以当代中文社会为参照：
- 地名使用中式地名（XX市/XX区/XX路/XX大厦/XX小区）
- 机构使用中文命名（公司/单位/学校/医院/政府部门）
- 人名使用中文姓名
- 社会规则以当代中国为参照`,
  },

  // ── 感情 / 言情 / 纯爱 ──────────────────────────────
  {
    category: 'romance',
    keywords: [
      '言情', '恋爱', '纯爱', '感情', '虐恋', '甜宠',
      '暗恋', '先婚后爱', '追妻', '火葬场', '破镜重圆',
      '双向奔赴', '单恋', '白月光', '替身', '契约婚姻',
      '豪门', '霸总', '青梅竹马', '欢喜冤家',
    ],
    dimension: {
      key: 'bond',
      label: '情感羁绊体系',
      sectionHeader: '情感羁绊体系',
      promptContent: `## 情感羁绊体系
先给出驱动本故事情感线的核心力量/关系规则（一句话），用 **术语** 加粗核心概念。
然后分点展开：
1. **核心情感驱动**：简述主角情感选择的底层逻辑（如"先婚后爱中从交易到真心的转化条件"）
2. **关系网与羁绊类型**：逐条列表（\`- \`）主角与他人的核心关系及每段关系的独特张力
3. **误解/冲突机制**：简述阻碍情感发展的结构性障碍（如阶级差距、家族恩怨、身份秘密、性格缺陷等）
4. **和解/升华路径**：简述情感关系从冲突走向和解的必经节点与关键条件`,
    },
    culturalOrientation: `根据类型标签和创意内容推断文化背景：
- 如为古代言情（含"古代""王爷""嫡女""宫斗""宅斗"等标签）：参照东方古代文化背景（中式地名/官制/服饰/礼仪），绝对禁止西方设定
- 如为现代言情（含"都市""豪门""霸总""校园"等标签）：参照当代中国都市背景
- 确保角色命名、场景描写、社会习俗与文化背景严格一致`,
  },

  // ── 悬疑 / 推理 / 灵异 ──────────────────────────────
  {
    category: 'mystery',
    keywords: [
      '悬疑', '推理', '侦探', '刑侦', '盗墓', '灵异',
      '惊悚', '恐怖', '探案', '破案', '谜题', '反转',
      '密室', '连环', '失踪', '诅咒', '民俗',
    ],
    dimension: {
      key: 'case',
      label: '谜题/案件体系',
      sectionHeader: '谜题/案件体系',
      promptContent: `## 谜题/案件体系
先给出本作谜题/案件的核心设定（一句话），用 **术语** 加粗核心概念。
然后分点展开：
1. **案件/谜题类型与层级**：逐条列表（\`- \`）核心案件及其在故事中的位置（主线/支线/引子）
2. **线索规则与侦查手段**：简述该世界中获取线索的途径、规则限制（如科技手段、超自然能力、人脉网络）
3. **势力格局与信息不对称**：逐条列出掌握不同信息片段的势力/人物，及其隐藏信息的动机
4. **真相层次与反转节奏**：简述真相被逐层揭开的结构（表面真相 → 深层真相 → 终极真相）`,
    },
    culturalOrientation: `根据类型标签和创意内容推断文化背景：
- 如为古代悬疑/探案：使用东方古代官制和侦查体系（县衙/刑部/提刑按察使司/大理寺/仵作/捕快），禁止出现西方侦探/警局等设定
- 如为现代推理：使用当代中国司法体系（公安局/检察院/法院/法医/刑侦队）
- 确保机构名称、侦查手段、社会背景与文化设定严格一致`,
  },
];

/**
 * 默认维度（当无法匹配任何体裁时使用）
 * 采用通用的"核心冲突体系"，不做任何体裁假设
 */
export const DEFAULT_DIMENSION: GenreDimension = {
  key: 'core',
  label: '核心冲突体系',
  sectionHeader: '核心冲突体系',
  promptContent: `## 核心冲突体系
先给出本作世界中最核心的矛盾/规则体系（一句话），用 **术语** 加粗核心概念。
分析用户创意中的类型标签（如有），判断最适用的体系方向后分点展开：
1. **体系定义与范围**：简述该体系是什么、覆盖哪些角色/势力
2. **规则与约束**：逐条列表（\`- \`）该体系的核心规则与硬限制
3. **参与者的动机与博弈**：简述各方势力/角色在该体系中的核心目标与策略
4. **破局方向**：简述主角可能的突破路径或体系的潜在崩塌点`,
};

export const DEFAULT_CULTURAL_ORIENTATION = `根据用户创意中出现的文化线索判断文化背景：
- 如创意中出现"朝廷""皇帝""郡县""科举""世家"等 → 东方古代背景
- 如创意中出现"公司""都市""职场""校园"等 → 现代中国背景
- 如创意中出现"星舰""联邦""外星"等 → 科幻背景
- 如无法判断，默认使用中文东方背景
所有命名、制度、建筑、服饰须与所选文化背景保持一致。`;

/**
 * 根据类型标签和创意文本匹配体裁
 * @param typeTags - 从卖点方案中提取的类型标签，如 "古代+权谋+正剧向"
 * @param ideaText - 创意/简介全文，用于补充匹配
 * @returns 匹配到的 GenreDimension 和体裁类别名
 */
export function matchGenre(typeTags: string, ideaText: string): {
  dimension: GenreDimension;
  category: string;
  culturalOrientation: string;
} {
  if (!typeTags && !ideaText) {
    return {
      dimension: DEFAULT_DIMENSION,
      category: 'default',
      culturalOrientation: DEFAULT_CULTURAL_ORIENTATION,
    };
  }

  const searchText = `${typeTags} ${ideaText}`.toLowerCase();

  // 按配置顺序匹配（后面的会覆盖前面的，所以更具体的匹配放后面）
  let bestMatch: GenreConfig | null = null;
  let bestScore = 0;

  for (const config of GENRE_CONFIGS) {
    let score = 0;
    for (const kw of config.keywords) {
      if (searchText.includes(kw.toLowerCase())) {
        score++;
      }
    }
    if (score > bestScore) {
      bestScore = score;
      bestMatch = config;
    }
  }

  if (bestMatch && bestScore > 0) {
    return {
      dimension: bestMatch.dimension,
      category: bestMatch.category,
      culturalOrientation: bestMatch.culturalOrientation,
    };
  }

  return {
    dimension: DEFAULT_DIMENSION,
    category: 'default',
    culturalOrientation: DEFAULT_CULTURAL_ORIENTATION,
  };
}

/**
 * 带主标签优先的体裁匹配。
 * 当用户选择了多个题材标签时（如"历史,蒸汽朋克,群像"），
 * 第一个标签为主标签，优先决定维度选择和文化锚定。
 * 后续标签作为辅助信号参与关键词匹配，但不覆盖主标签的选择。
 *
 * @param allTypeTags - 所有类型标签（逗号分隔或空格分隔）
 * @param primaryGenre - 主标签（用户选择的第一个标签）
 * @param ideaText - 创意/简介全文
 */
export function matchGenreWithPrimary(
  allTypeTags: string,
  primaryGenre: string,
  ideaText: string,
): {
  dimension: GenreDimension;
  category: string;
  culturalOrientation: string;
} {
  if (!allTypeTags && !ideaText) {
    return {
      dimension: DEFAULT_DIMENSION,
      category: 'default',
      culturalOrientation: DEFAULT_CULTURAL_ORIENTATION,
    };
  }

  const primary = primaryGenre.trim().toLowerCase();
  const searchText = `${allTypeTags} ${ideaText}`.toLowerCase();

  // 步骤1：找到主标签匹配的 config
  let primaryConfig: GenreConfig | null = null;
  if (primary) {
    for (const config of GENRE_CONFIGS) {
      for (const kw of config.keywords) {
        if (primary.includes(kw.toLowerCase()) || kw.toLowerCase().includes(primary)) {
          primaryConfig = config;
          break;
        }
      }
      if (primaryConfig) break;
    }
  }

  // 步骤2：验证主标签在 searchText 中至少有一个 keyword 命中
  if (primaryConfig) {
    let primaryScore = 0;
    for (const kw of primaryConfig.keywords) {
      if (searchText.includes(kw.toLowerCase())) {
        primaryScore++;
      }
    }
    // 主标签匹配至少 1 个 keyword → 直接使用
    if (primaryScore > 0) {
      return {
        dimension: primaryConfig.dimension,
        category: primaryConfig.category,
        culturalOrientation: primaryConfig.culturalOrientation,
      };
    }
  }

  // 步骤3：fallback — 原始 scoring 逻辑
  return matchGenre(allTypeTags, ideaText);
}

/**
 * 将 GenreDimension 的 promptContent 渲染为模板变量 {{dynamicDimensionSection}} 的值
 */
export function renderDimensionSection(dimension: GenreDimension): string {
  return dimension.promptContent;
}

/**
 * 获取前端展示用的维度配置列表（前3个通用 + 第4个体裁维度）
 */
export function getFrontendDimensions(dimension: GenreDimension): Array<{
  key: string;
  label: string;
  sectionHeader: string;
}> {
  return [
    { key: 'era', label: '时代背景', sectionHeader: '时代背景' },
    { key: 'geography', label: '地理环境', sectionHeader: '地理环境' },
    { key: 'society', label: '社会结构', sectionHeader: '社会结构' },
    { key: dimension.key, label: dimension.label, sectionHeader: dimension.sectionHeader },
  ];
}
