# Changelog — libindesign.com

版本号格式：`vMAJOR.MINOR.PATCH`
- MAJOR：大改版（整体重构、视觉风格换代）
- MINOR：新增项目 / 新增页面 / 功能迭代
- PATCH：修复 Bug、微调样式、更新文案

---

## v1.0.0 — 2026-05-24

**首次正式上线**

### 新增
- 首页横向滚动卡片（7 张：封面 + 6 个分类）
- 项目详情页 `project.html`（支持图片 / 视频）
- 分类列表页 `category.html`（Consumer UX / Enterprise UX / Visual / Motion）
- 动效页瀑布流布局 + hover 播放视频
- Vercel 部署 + `libindesign.com` 自定义域名绑定
- 全站 WebP 图片 + 1 年 immutable 缓存头

### 包含项目
- 秒省助手（AI 设计）
- 宠胖胖、闪聚、Block Pixel Puzzle（Consumer UX）
- OTO 保险 CRM、水豚大夫、客集集直播、其他 UI（Enterprise UX）
- 视觉作品 01–04（Visual Design）
- 交互动效 / 界面微交互 / IP 动画（Motion Design）

### 技术
- 纯静态 HTML + CSS + JS，无框架依赖
- Vercel Edge CDN，HTTPS 自动签发
- DNS：libindesign.com → A @ 216.198.79.1（Vercel）

---

<!-- 下次发版在上方添加新条目，保留历史记录 -->
