开发计划：独立的新推文书写与草稿管理系统
核心理念
将“草稿管理、图文整理、AI排版”从渲染器中解耦，单独作为一个轻量级的独立项目开发（可能在新仓库中）。排版完成后的内容通过接口/URL跳转/剪贴板等方式送入现有的 Markdown 编辑器前端进行最终渲染与公众号同步。

功能清单
1. 草稿本管理系统 (Draft Gallery)
 画廊式 UI：卡片式展示历史草稿，包含标题、封面图提取、最后修改时间。
 多平台标签体系：支持为内容提供“微信公众号”、“小红书”、“抖音”等标签归类。
 本地存储架构：使用 localForage 或 IndexedDB 持久化保存用户的历史记录，不受刷新影响。
2. 长文预处理编辑区 (Draft Editor)
 纯文本与富媒体混排容器：支持用户随时粘贴 Word、网页内容或普通文本。
 拖拽与粘贴识图：内置监听事件，当用户粘贴或拖入本地文件、截图时，自动接管。
 自动上传流水线：集成图床（如 GitHub / 阿里云 OSS），拖入图片自动后台上传，并在原文中静默替换为 Markdown 外链格式 ![图片](...)。
3. AI 智能排版流水线 (AI Processor)
 模型与 Prompt 管理：提供接口配置（如 glm-4.6v API Key），以及内置“公众号推荐阅读、免责声明等固定版式”的 System Prompt。
 一键排版触发：点击后，获取处理过图床链接的最终草稿，发送给 AI 进行结构润色。
4. 渲染器桥接模块 (Renderer Bridge)
 一键预览机制：将处理完成的 Markdown 结果构建为 Payload。
 通信实现：通过剪贴板拷贝、window.open('https://渲染器地址/?content=xxx')，或是 postMessage 的形式将排版好的代码分发至现有的渲染前端项目以供预览和复制。
项目初始化建议
技术栈：Vue 3 + Vite + TailwindCSS + Pinia，或者采用 Next.js (React) 构建纯静态/轻量级单页应用。
输出格式：支持纯静态 Build（dist），可轻松部署在 Vercel、Netlify 或任意 CDN 上。

实施计划：推文书写与草稿管理系统 (独立项目)
基于最新的架构决策，推文的“预处理与草稿管理”功能应当与“解析和渲染”功能完全解耦。现有的 Markdown 前端（wind-web）在执行渲染与 CSS 解析的能力上已经非常成熟，将纯粹作为预览渲染的受端站点。

本系统将作为独立的新项目全新开发，侧重于内容的输入、草稿管理、存储以及 AI 加工。

目标架构
⚠️ Failed to render Mermaid diagram: Parse error on line 2
graph LR
    subgraph 新草稿系统 (独立项目)
        A[草稿列表与管理] --> B(纯文本输入与图文拖拽)
        B --> C[图床静默上传拦截]
        C --> D[AI 智能排版润色]
    end
    
    subgraph 原由 Markdown 编辑前端
        E[渲染预览与 CSS 样式调整]
        F[公众号复制同步]
    end

    D -- "Markdown 结果传输\n(URL 参数 / postMessage / 剪贴板)" --> E
    E --> F
技术栈建议
由于该项目仅关注纯数据流和 UI 交互，可以选择以下现代构建方式以使其能编译为纯静态项目：

框架：Vue 3 + Vite + TypeScript 或是 React + Vite。
状态与存储：使用 Pinia / Zustand 搭配 localForage (IndexedDB) 进行本地持久化草稿存储。
UI 组件库：继续沿用极简的 Shadcn-UI (Vue/React 版本皆可)。
部署：纯前端静态打包 npm run build，产生 dist 后挂载到 Serverless 平台。
核心模块设计
1. 草稿画廊 (Gallery Module)
目的：解决长文工作流中，文章多、进度零散的问题。

UI 呈现：网格排布的卡片形式。每张卡片含：正文首图提取得到的封面、标题、最近编辑时间。
逻辑：对 IndexedDB 执行 CRUD，支持给不同文章打标签分类。
2. 增强型草稿输入 (Editor Module)
目的：最轻量、最快捷的文本及素材倾倒区。

使用原生的 <textarea>，并通过绑定 @paste 和 @drop 事件来劫持用户输入。
文本正常放行；检测到剪贴板或拖放包含 image/* 时，拦截并直接调用云端/GitHub URL 转存 API。
转存成功后，将光标处的字符默默替换为 Markdown 图片链接格式 ![]()。
3. AI 工作流集成 (AI Pipeline)
目的：统一发送。

设置系统内置的 System Prompt，约束输出格式。
将输入框内的最终带有图床链接的纯文本，通过流式 API fetch glm-4.6v 服务。
在页面实现打字机效果回显。
4. 桥接与分发 (Bridge & Broadcast)
目的：连接原有生态。

方案 A (推荐)：在页面上添加**“到渲染器中预览”**按钮，点击后自动将最终排版完的 Markdown 内容写入用户剪贴板，并window.open原前端编辑器地址。
方案 B：利用原网站的 Import 参数，如 https://m.yourrenderer.com/?content=base64_encoded_markdown 进行免复制自动预填充渲染。