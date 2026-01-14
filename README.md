# UI-UX-Collector

**Chrome 插件** for [ui-ux-pro-max](https://github.com/feitangyuan/ui-ux-pro-max) skill (1w+ ⭐)

> 浏览网页时一键收集 UI 设计，自动分析风格/配色/字体，存入本地知识库。

## 为什么需要这个插件？

[ui-ux-pro-max](https://github.com/feitangyuan/ui-ux-pro-max) 是 Claude Code 的 UI/UX 设计助手，内置 50+ 风格库。这个插件让你：

- **实时收集**：看到喜欢的网页，点一下就保存
- **自动分析**：Claude 自动提取颜色、字体、布局、效果
- **可搜索**：以后设计时，让 Claude 参考你收集的案例

## 演示

```
┌─────────────────────────────────────────────────────────┐
│  1. 浏览网页        2. 点击插件         3. 查看收藏      │
│  ┌─────────┐      ┌─────────┐       ┌─────────┐        │
│  │ 网页内容 │  →   │ Analyze │   →   │ 已保存   │        │
│  └─────────┘      └─────────┘       └─────────┘        │
└─────────────────────────────────────────────────────────┘
```

## 前提条件（必须）

这个插件依赖以下工具，使用前请先安装：

### 1. Claude CLI

```bash
curl -fsSL https://claude.ai/install.sh | sh
claude -v  # 验证
```

### 2. ui-ux-pro-max skill

```bash
git clone https://github.com/feitangyuan/ui-ux-pro-max.git ~/.claude/skills/ui-ux-pro-max
ls ~/.claude/skills/ui-ux-pro-max  # 验证
```

---

## 安装

### 1. 下载插件

```bash
git clone https://github.com/feitangyuan/UI-UX-Collector.git ~/ui-ux-collector
```

### 2. 安装到 Chrome

1. 打开 `chrome://extensions`
2. 开启「开发者模式」（右上角）
3. 点击「加载已解压的扩展程序」
4. 选择 `~/ui-ux-collector/extension` 文件夹

### 3. 启动服务器

```bash
node ~/ui-ux-collector/host/server.js
```

看到以下输出表示成功：

```
╔═══════════════════════════════════════════════════════════╗
║  UI/UX Design Collector - Host Server                     ║
║  Running on http://localhost:3847                         ║
╚═══════════════════════════════════════════════════════════╝
```

---

## 使用

### 收集设计

1. 浏览任意网页
2. 点击 Chrome 工具栏的插件图标
3. 点击「Analyze This Page」
4. 等待 Claude 分析完成（约 10-30 秒）

### 查看收藏

点击插件图标 → 「View Collection」

- 点击卡片展开详情
- 点击 × 删除

### 在 Claude Code 中搜索

```bash
# 搜索你收集的设计
python3 ~/.claude/skills/ui-ux-pro-max/scripts/search.py "dark glassmorphism" --domain collected

# 搜索预设风格库
python3 ~/.claude/skills/ui-ux-pro-max/scripts/search.py "fintech" --domain style

# 搜索配色方案
python3 ~/.claude/skills/ui-ux-pro-max/scripts/search.py "saas" --domain color
```

---

## 文件结构

```
ui-ux-collector/
├── extension/          # Chrome 插件
│   ├── manifest.json
│   ├── popup.html
│   ├── popup.js
│   └── content.js
├── host/
│   └── server.js       # 本地服务器（连接 Claude CLI）
└── README.md
```

设计数据保存在 ui-ux-pro-max skill 的 data 目录：

```
~/.claude/skills/ui-ux-pro-max/data/
├── styles.csv              # 50 种 UI 风格
├── colors.csv              # 21 种配色方案
├── typography.csv          # 50 种字体搭配
└── collected-designs.csv   # 你收集的设计 ⭐
```

---

## 常见问题

### 插件显示 "Host not running"

启动服务器：`node ~/ui-ux-collector/host/server.js`

### 分析结果只显示 "Custom"

Claude CLI 调用失败，检查：
1. 是否安装了 Claude CLI
2. 终端运行 `claude -p "test"` 是否正常

### 如何备份收集的设计？

复制 `~/.claude/skills/ui-ux-pro-max/data/collected-designs.csv` 文件即可。

---

## 设计理念

收集越多 → 知识库越丰富 → Claude 设计建议越精准

这是**个人进化**的设计知识库，你收集的每个网站都会成为未来设计的参考案例。
