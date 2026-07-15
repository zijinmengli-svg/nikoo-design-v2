# 首页浏览器标签名称修改 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将首页浏览器标签名称从“李彬 · 作品集”改为“李彬 · 个人网站”。

**Architecture:** 保留现有纯静态 HTML 架构，只替换 `index.html` 的 `<title>` 文本。浏览器读取 HTML `<head>` 后直接显示新标题，不增加脚本、依赖或运行时逻辑。

**Tech Stack:** HTML5、Shell、项目现有 Python 静态开发服务器

## Global Constraints

- 仅修改 `index.html` 中的静态 `<title>` 文本。
- 标题必须准确为“李彬 · 个人网站”。
- 不修改首页可见内容、样式、交互或资源。
- 不修改 `about.html`、`category.html`、`project.html` 等其他页面的标题。
- 不增加 JavaScript 动态覆盖逻辑。
- 不推送 Git 远端，不触发 Vercel 线上部署。

---

### Task 1: 修改并验证首页浏览器标签名称

**Files:**
- Modify: `index.html:6`
- Verify unchanged: `about.html`
- Verify unchanged: `category.html`
- Verify unchanged: `project.html`

**Interfaces:**
- Consumes: 浏览器对 HTML `<head><title>` 的原生解析。
- Produces: 首页的 `document.title` 值“李彬 · 个人网站”。

- [ ] **Step 1: 运行目标标题断言，确认修改前失败**

Run:

```bash
test "$(rg -o '<title>[^<]*</title>' index.html)" = '<title>李彬 · 个人网站</title>'
```

Expected: FAIL，退出码为 `1`；当前实际标题是 `<title>李彬 · 作品集</title>`。

- [ ] **Step 2: 实施最小修改**

将 `index.html:6` 从：

```html
  <title>李彬 · 作品集</title>
```

改为：

```html
  <title>李彬 · 个人网站</title>
```

- [ ] **Step 3: 运行目标标题断言，确认修改后通过**

Run:

```bash
test "$(rg -o '<title>[^<]*</title>' index.html)" = '<title>李彬 · 个人网站</title>'
test "$(rg -c '<title>[^<]*</title>' index.html)" -eq 1
```

Expected: PASS，退出码为 `0`，首页只有一个 `<title>`。

- [ ] **Step 4: 通过本地网站读取首页**

在一个终端启动项目现有开发服务器：

```bash
python3 dev-server.py 8123
```

在另一个终端读取首页：

```bash
curl -fsS http://127.0.0.1:8123/index.html | rg -o '<title>[^<]*</title>'
```

Expected:

```text
<title>李彬 · 个人网站</title>
```

验证后停止开发服务器。

- [ ] **Step 5: 检查改动范围和格式**

Run:

```bash
git diff --check
git diff --exit-code HEAD -- about.html category.html project.html
git diff -- index.html
```

Expected: 前两个检查退出码为 `0`；`index.html` 差异只包含一行标题替换。

- [ ] **Step 6: 提交实施结果**

```bash
git add index.html docs/superpowers/plans/2026-07-15-homepage-title.md
git commit -m "fix: 更新首页浏览器标签名称"
```
