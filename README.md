# AI 文档阅读器

一款基于 Electron 的桌面 AI 文档阅读器。支持同时打开多个 PDF / Word / TXT 文档,在右侧与 AI 进行基于当前文档的问答、划词解释和全文总结。

## 功能特性

- **多标签页阅读**:同时打开多个文档,每个文档独立标签,独立 AI 上下文
- **多格式支持**:PDF、DOC、DOCX、TXT、MD
- **AI 问答**:基于当前文档内容进行多轮对话
- **划词问答**:选中任意文字,一键"问 AI"
- **全文总结**:手动触发文档核心要点总结
- **通用模型配置**:支持智谱 GLM、DeepSeek、通义千问等任何 OpenAI 兼容接口
- **窗口状态记忆**:自动记住窗口大小、位置和最大化状态
- **侧边栏折叠**:文件列表和 AI 面板均可折叠,释放阅读空间

## 下载安装

直接从 [Releases](../../releases) 页面下载最新版本的 `AI 文档阅读器 x.x.x.exe`,双击即可运行,无需安装。

## 快速开始

1. 运行程序
2. 点击左侧"打开文件"或"打开文件夹"导入文档
3. 点击文件在标签页中打开
4. 在右侧 AI 面板配置你的 API Key(右上角 ⚙️)
5. 开始提问、划词问答或总结全文

## 模型配置

支持所有 OpenAI 兼容接口的大模型服务:

| 服务商 | Base URL | 推荐模型 |
|--------|----------|----------|
| 智谱 AI | `https://open.bigmodel.cn/api/paas/v4` | `glm-4-flash` |
| DeepSeek | `https://api.deepseek.com/v1` | `deepseek-chat` |
| 通义千问 | `https://dashscope.aliyuncs.com/compatible-mode/v1` | `qwen-turbo` |

配置方式:
1. 点击右上角 ⚙️ 打开配置面板
2. 填入 Base URL、API Key、模型名称
3. 设置最大上下文长度(默认 8000)
4. 保存

也可以在项目根目录创建 `.env` 文件:

```env
LLM_BASE_URL=https://open.bigmodel.cn/api/paas/v4
LLM_API_KEY=your-api-key
LLM_MODEL=glm-4-flash
LLM_MAX_CONTEXT_LENGTH=8000
```

## 开发

### 环境要求

- Node.js 18+
- Windows(当前主要支持平台)

### 安装依赖

```bash
npm install
```

### 运行开发版本

```bash
npm start
```

### 运行测试

```bash
npm test
```

### 打包

```bash
npm run dist:win
```

打包产物输出到 `release/` 目录:
- `release/AI 文档阅读器 x.x.x.exe` - 单文件便携版
- `release/win-unpacked/` - 解压版文件夹

## 项目结构

```
ai-document-reader/
├── docs/
│   └── design.md              # 设计文档
├── src/
│   ├── main/                  # Electron 主进程
│   │   ├── main.js
│   │   ├── file-handler.js    # 文档解析
│   │   ├── llm-client.js      # LLM 调用
│   │   ├── context-store.js   # 对话上下文
│   │   └── window-state.js    # 窗口状态持久化
│   ├── renderer/              # 渲染进程 UI
│   │   ├── index.html
│   │   ├── app.js
│   │   ├── styles.css
│   │   └── tab-manager.js     # 标签页状态管理
│   └── preload/
│       └── preload.js         # 安全桥接
├── tests/                     # 单元测试
├── .env.example
├── package.json
└── README.md
```

## 技术栈

- Electron 31
- Node.js
- HTML / CSS / JavaScript
- pdf-parse
- word-extractor
- electron-store
- electron-builder

## 支持格式与边界

| 格式 | 支持情况 | 说明 |
|------|----------|------|
| PDF | ✅ | 提取文本内容,不支持扫描版图片 PDF |
| DOC | ✅ | 使用 word-extractor 提取纯文本 |
| DOCX | ✅ | 使用 word-extractor 提取纯文本 |
| TXT | ✅ | 直接读取 |
| MD | ✅ | 作为纯文本显示 |

**注意**:
- 复杂 Word 排版(表格、图文混排)会丢失格式,仅保留纯文本
- 超长文档会按设置的最大上下文长度自动截断
- 当前不支持跨文档联合问答

## 贡献

欢迎提交 Issue 和 PR。

## 许可证

MIT
