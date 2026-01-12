# UI-UX-Collector

> **ui-ux-pro-max skill 的 Chrome 设计收集插件**

收集网页设计 → 自动分析风格/配色/效果 → 存入本地知识库 → Claude 设计时可搜索参考。

## 前提条件（必须）

这个插件是 [ui-ux-pro-max](https://github.com/feitangyuan/ui-ux-pro-max) skill 的增强工具，使用前需要先安装：

### 1. Claude CLI

```bash
# 安装 Claude CLI
curl -fsSL https://claude.ai/install.sh | sh

# 验证安装
claude -v
```

### 2. ui-ux-pro-max skill

```bash
# 安装 skill
git clone https://github.com/feitangyuan/ui-ux-pro-max.git ~/.claude/skills/ui-ux-pro-max

# 验证安装
ls ~/.claude/skills/ui-ux-pro-max
```

---

## 安装插件

### 1. 下载插件

```bash
git clone https://github.com/feitangyuan/UI-UX-Collector.git ~/ui-ux-collector
```

### 2. 安装到 Chrome

1. Chrome 地址栏输入 `chrome://extensions`
2. 开启右上角「开发者模式」
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

### 查看收集

点击插件图标 → 「View Collection」

- 点击卡片展开详情
- 点击 × 删除

### 在 Claude Code 中搜索

```bash
# 搜索收集的设计
python3 ~/.claude/skills/ui-ux-pro-max/scripts/search.py "dark glassmorphism" --domain collected

# 搜索预设风格库
python3 ~/.claude/skills/ui-ux-pro-max/scripts/search.py "fintech modern" --domain style

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
└── README.md           # 本文档
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
