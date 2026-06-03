# Hooyi

电影筛选与推荐网站。

- 前端：Vite + React
- 后端：Express API
- 外部服务：TMDB、DeepSeek

## 本地运行

1. 安装依赖：

   ```powershell
   npm install
   ```

2. 复制 `.env.example` 为 `.env.local`，填入 TMDB 和 DeepSeek 配置。

   密钥只放在后端环境变量里，不要写进前端代码，也不要用 `VITE_` 前缀暴露密钥。

3. 启动后端 API：

   ```powershell
   npm.cmd run api
   ```

4. 另开一个终端启动前端：

   ```powershell
   npm.cmd run dev
   ```

默认地址：

- 前端：http://localhost:3000
- 后端：http://localhost:3001

## 可用接口

- `GET /health`：后端健康检查
- `GET /api/movies`：加载 TMDB 候选片库
- `GET /api/movies/search?q=keyword`：按搜索词从 TMDB 动态补充电影
- `POST /api/vibe`：调用 DeepSeek 生成 Vibe 推荐

## 验证

```powershell
npm.cmd run lint
npm.cmd run build
npm.cmd run build:server
```

## 上线方案

推荐形态：

- 前端部署到 Netlify
- 后端部署到 Render

### 后端：Render

项目已包含 `render.yaml`。在 Render 创建 Web Service 后，使用：

- Build Command：`npm install && npm run build:server`
- Start Command：`npm run start`
- Health Check Path：`/health`

Render 环境变量：

- `TMDB_READ_TOKEN`
- `TMDB_API_KEY`
- `DEEPSEEK_API_KEY`
- `TMDB_WATCH_REGIONS=CN,US`
- `DEEPSEEK_MODEL=deepseek-chat`
- `CORS_ORIGINS=https://你的 Netlify 域名`
- `API_PROXY_URL`：可选，只有后端访问 TMDB 或 DeepSeek 需要代理时才填

### 前端：Netlify

项目已包含 `netlify.toml`。Netlify 会执行：

- Build Command：`npm run build`
- Publish Directory：`dist`

Netlify 环境变量：

- `VITE_API_BASE_URL=https://你的 Render 后端域名`

前端重新部署后，用户打开 Netlify 链接时会通过线上后端读取 TMDB 电影、搜索补充和 Vibe 推荐。
