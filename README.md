# UI/UX Pro Max

UI/UX 设计智能助手 + Chrome 设计收集插件。

收集网页设计 → 自动分析风格/配色/效果 → 存入本地知识库 → Claude 设计时可搜索参考。

## 快速开始

### 1. 安装 Skill（必需）

**方法 1：直接克隆（推荐）**
```bash
git clone https://github.com/feitangyuan/UI-UX-Collector.git ~/.claude/skills/ui-ux-pro-max
```

**方法 2：手动下载后复制**
1. 从 GitHub 下载 ZIP 并解压
2. 复制到 skills 目录：
```bash
cp -r UI-UX-Collector ~/.claude/skills/ui-ux-pro-max
```

### 2. 安装 Chrome 插件

1. Chrome 地址栏输入 `chrome://extensions`
2. 开启右上角「开发者模式」
3. 点击「加载已解压的扩展程序」
4. 选择 `~/.claude/skills/ui-ux-pro-max/extension` 文件夹

### 3. 启动服务器

```bash
node ~/.claude/skills/ui-ux-pro-max/host/server.js
```

看到以下输出表示成功：
```
╔═══════════════════════════════════════════════════════════╗
║  UI/UX Design Collector - Host Server                     ║
║  Running on http://localhost:3847                         ║
╚═══════════════════════════════════════════════════════════╝
```

### 4. 开始收集

1. 浏览任意网页
2. 点击 Chrome 工具栏的插件图标
3. 点击「Analyze This Page」
4. 等待 Claude 分析完成（约 10-30 秒）

## 功能说明

### Chrome 插件

- **Analyze This Page**: 分析当前网页的 UI/UX 设计
  - 提取颜色、字体、布局、效果
  - Claude 自动分析风格类型、适用场景、注意事项
  - 保存到本地知识库

- **View Collection**: 查看已收集的设计
  - 点击卡片展开详情
  - 点击 × 删除

### Claude Code Skill

在 Claude Code 中，可以搜索你收集的设计：

```bash
# 搜索收集的设计
python3 ~/.claude/skills/ui-ux-pro-max/scripts/search.py "dark glassmorphism" --domain collected

# 搜索预设风格库
python3 ~/.claude/skills/ui-ux-pro-max/scripts/search.py "fintech modern" --domain style

# 搜索配色方案
python3 ~/.claude/skills/ui-ux-pro-max/scripts/search.py "saas" --domain color
```

## 文件结构

```
ui-ux-pro-max/
├── extension/          # Chrome 插件
│   ├── manifest.json
│   ├── popup.html
│   ├── popup.js
│   └── content.js
├── host/
│   └── server.js       # 本地服务器（连接 Claude CLI）
├── scripts/
│   ├── search.py       # 搜索脚本
│   └── core.py         # 搜索引擎核心
├── data/
│   ├── styles.csv      # 50 种 UI 风格
│   ├── colors.csv      # 21 种配色方案
│   ├── typography.csv  # 50 种字体搭配
│   ├── collected-designs.csv  # 你收集的设计 ⭐
│   └── ...
├── SKILL.md            # Skill 说明（Claude 读取）
└── README.md           # 本文档
```

## 依赖

- Node.js（运行服务器）
- Python 3（搜索脚本）
- Claude CLI（分析设计）
- Chrome 浏览器

## 常见问题

### 插件显示 "Host not running"
启动服务器：`node ~/.claude/skills/ui-ux-pro-max/host/server.js`

### 分析结果只显示 "Custom"
Claude CLI 调用失败，检查：
1. 是否安装了 Claude CLI
2. 终端运行 `claude -p "test"` 是否正常

### 如何备份收集的设计？
复制 `data/collected-designs.csv` 文件即可。

## 设计理念

收集越多 → 知识库越丰富 → Claude 设计建议越精准

这是**个人进化**的设计知识库，你收集的每个网站都会成为未来设计的参考案例。
