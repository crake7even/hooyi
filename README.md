<div align="center">
  <img src="public/logo.png" alt="好影 Hooyi" width="88" />
  <h1>好影 Hooyi</h1>
  <p>从片库筛选、随心一刷到 Vibe 情绪推荐，找到此刻真正想看的电影。</p>

  [![CI](https://github.com/crake7even/hooyi/actions/workflows/ci.yml/badge.svg)](https://github.com/crake7even/hooyi/actions/workflows/ci.yml)
  [![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
  [![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=111)](https://react.dev/)
  [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
  [![Live Demo](https://img.shields.io/badge/Live_Demo-Netlify-00C7B7?logo=netlify&logoColor=white)](https://hooyi.netlify.app/)
</div>

<p align="center">
  <img src="docs/screenshots/hooyi-desktop.png" alt="好影桌面端首页" width="900" />
</p>



## 在线体验

- Web：[https://hooyi.netlify.app](https://hooyi.netlify.app/)
- API Health：[https://hooyi.onrender.com/health](https://hooyi.onrender.com/health)

> Render 免费实例休眠后，首次请求可能需要等待冷启动。线上环境只用于作品集演示，不应放入真实账户或敏感数据。

## 项目简介

Hooyi 是一个面向“选择困难”场景的电影发现应用。它将 TMDB 实时片库、流媒体平台信息、可解释的本地排序和 DeepSeek 情绪推荐组合在一起，默认无需账号、数据保存在本地，并预留了 Supabase 云端同步能力。

核心目标不是再做一个电影列表，而是把“我现在适合看什么”转化为可以筛选、可以解释、可以继续反馈的产品流程。

## 核心功能

- **动态片库**：聚合 TMDB 热门、高分、上映中和多语言类型片单，带文件缓存与降级策略。探索目录横向滚动到末尾时自动续上下一批。
- **多维筛选**：顶部筛选按钮展开面板，支持类型、年份、评分、语言和播放平台；有条件生效时按钮显示数量角标，一键重置。
- **随心一刷**：拖动卡片或使用底部按钮——左右切换上一部 / 下一部，上滑不感兴趣，下滑加入待看；拖动时显示方向标签，操作后 5 秒内可撤销，并持续更新类型偏好分数。
- **Vibe 推荐**：根据自然语言描述与当前筛选条件生成结构化推荐，并校验结果必须来自真实候选片库。
- **详情与相似推荐**：详情弹窗展示播放平台，相似影片按共同类型数量和评分排序。
- **本地优先的数据**：待看、观看历史和偏好保存在 localStorage。Supabase 账号同步的代码已具备（Row Level Security 隔离用户数据），线上演示未启用登录。
- **一屏布局**：桌面端（高度 ≥ 720px）首页与随心一刷在一个视口内完整显示；更矮的屏幕和移动端回退为纵向滚动，移动端资料库可折叠。支持日间 / 夜间主题。

### 键盘操作

| 场景 | 按键 |
|---|---|
| 随心一刷 | `←` 上一部，`→` 下一部，`↑` 不感兴趣，`↓` 加入待看，`Enter` 打开详情 |
| 详情弹窗、数据来源浮层 | `Esc` 关闭，焦点回到打开它的位置 |
| 全站 | `Tab` 可到达所有按钮与卡片，带可见焦点样式 |

在搜索框、Vibe 输入框中打字或详情弹窗打开时，随心一刷快捷键不生效。

## 架构

```mermaid
flowchart LR
  U["React / Vite 客户端"] -->|"片库、搜索、Vibe"| A["Express API"]
  A -->|"服务端 Token"| T["TMDB API"]
  A -->|"结构化推荐"| D["DeepSeek API"]
  A --> C["内存缓存 + JSON 降级缓存"]
  U -->|"可选登录与同步"| S["Supabase Auth + RLS"]
  U --> L["localStorage fallback"]
```

### 关键数据流

1. 前端先加载内置/静态缓存，保证接口冷启动或短暂故障时仍有内容。
2. Express 在后台刷新 TMDB 数据，API Key 只存在于服务端环境变量。
3. Vibe 请求最多携带 60 部经过字段裁剪的候选影片；服务端再次校验、限流并过滤演示不适宜内容。
4. DeepSeek 返回 JSON 后，服务端按 `movieId/title` 回查真实片库；解析失败时使用本地评分算法降级。

## 工程设计

- **Secret boundary**：TMDB 与 DeepSeek 凭据没有 `VITE_` 前缀，不进入浏览器 bundle。
- **Cost control**：`/api/vibe` 有请求体上限、消息长度限制、固定窗口 IP 限流和上游 timeout。
- **Resilience**：TMDB 片库使用 stale-while-refresh 思路，缓存刷新异常时继续使用上一次完整数据。
- **Data isolation**：Supabase 四张用户表启用 RLS，策略只允许访问 `auth.uid()` 对应的数据。
- **Safe demo mode**：默认启用 `DEMO_SAFE_MODE`，缓存生成、搜索和 Vibe 候选池共用内容过滤规则。
- **Reproducibility**：Node 22、锁文件、GitHub Actions、Node Test Runner 与生产构建组成统一检查链。

## 技术栈

| 层级 | 技术 |
|---|---|
| Frontend | React 19、TypeScript、Vite、Tailwind CSS、Motion、Lucide |
| Backend | Express、Node.js、Undici、esbuild |
| Data / AI | TMDB API、DeepSeek API |
| Optional persistence | Supabase Auth、PostgreSQL、Row Level Security |
| Deployment | Netlify、Render、GitHub Actions |

## 本地运行

要求：Node.js 22+、npm，以及自己的 TMDB / DeepSeek 开发凭据。不要把 API Key、Token 或 Supabase `service_role` 写入代码、日志或提交历史。

```powershell
git clone https://github.com/crake7even/hooyi.git
Set-Location hooyi
npm.cmd ci
Copy-Item .env.example .env.local
```

编辑 `.env.local`，至少填写：

```dotenv
TMDB_READ_TOKEN="YOUR_TMDB_READ_ACCESS_TOKEN"
DEEPSEEK_API_KEY="YOUR_DEEPSEEK_API_KEY"
```

分别启动后端和前端：

```powershell
# Terminal 1
npm.cmd run api

# Terminal 2
npm.cmd run dev
```

- Frontend：http://localhost:3000
- Backend：http://localhost:3001
- Health：http://localhost:3001/health

## 环境变量

| 变量 | 必需 | 用途 |
|---|---:|---|
| `TMDB_READ_TOKEN` | 是 | 服务端读取 TMDB 数据 |
| `DEEPSEEK_API_KEY` | Vibe 必需 | 服务端生成情绪推荐 |
| `VITE_API_BASE_URL` | 生产必需 | 浏览器访问 Express API 的公开地址 |
| `VITE_SUPABASE_URL` | 否 | 开启账号与云端同步 |
| `VITE_SUPABASE_ANON_KEY` | 否 | Supabase 公共 anon key；不要使用 `service_role` |
| `CORS_ORIGINS` | 生产必需 | 允许访问 API 的前端 Origin，逗号分隔 |
| `DEMO_SAFE_MODE` | 否 | 默认 `true`，过滤演示不适宜内容 |
| `VIBE_RATE_LIMIT` | 否 | 单个 IP 在窗口内的 Vibe 请求数，默认 `10` |
| `VIBE_RATE_WINDOW_MS` | 否 | 限流窗口，默认 `600000` ms |
| `TMDB_TIMEOUT_MS` | 否 | TMDB 请求 timeout，默认 `12000` ms |
| `DEEPSEEK_TIMEOUT_MS` | 否 | DeepSeek 请求 timeout，默认 `25000` ms |
| `API_PROXY_URL` | 否 | 仅本地或明确需要代理的服务端环境使用 |

完整示例见 [`.env.example`](.env.example)。

## 验证

```powershell
npm.cmd run typecheck
npm.cmd test
npm.cmd run build:all
npm.cmd audit
```

也可以一次执行：

```powershell
npm.cmd run check
```

当前测试覆盖输入校验、API 限流、演示内容过滤、电影筛选排序与偏好排序。GitHub Actions 会在 push 到 `main` 或 Pull Request 时执行安全审计、类型检查、测试和双端构建。

## 项目结构

```text
.
├─ .github/workflows/ci.yml    # CI
├─ data/                       # 服务端片库缓存
├─ public/                     # 静态资源与前端降级缓存
├─ scripts/                    # 可重复的数据维护脚本
├─ src/
│  ├─ api/                     # Browser API clients
│  ├─ components/              # UI components
│  └─ App.tsx                  # Application orchestration
├─ tests/                      # Node Test Runner tests
├─ server-safety.ts            # 输入清洗、限流、timeout、内容过滤
├─ server.ts                   # Express API 与推荐流程
└─ supabase-schema.sql         # 表结构与 RLS policies
```

## 已知限制与后续方向

- 当前限流存储在单个 Node 进程内；多实例部署应迁移到 Redis/KV。
- 电影横向目录采用分批渲染而非完整虚拟列表，适合当前 320 部规模；更大数据集应使用窗口化。
- 内容过滤用于作品集安全演示，不替代完整的年龄分级、地区政策和人工审核系统。
- Supabase Schema 面向新项目初始化；正式迁移应改用版本化 migration。

## 数据来源与声明

影片元数据和图片来自 [The Movie Database (TMDB)](https://www.themoviedb.org)，播放平台信息由 [JustWatch](https://www.justwatch.com) 提供。

> This product uses the TMDB API but is not endorsed or certified by TMDB.

详细声明见 [CREDITS.md](CREDITS.md)。
