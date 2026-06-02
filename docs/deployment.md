# NovelCraft Pro 部署文档

## 架构概览

```
┌───────────────────────────┐       ┌───────────────────────────┐
│         Vercel            │       │          Render           │
│   (Vue 3 + Vite SPA)     │ ────► │   (NestJS 11 + Prisma)   │
│                           │  API  │                           │
│  novelcraft.vercel.app    │       │  novelcraft.onrender.com  │
└───────────────────────────┘       └───────────┬───────────────┘
                                                │
                                                ▼
                                    ┌───────────────────────┐
                                    │    MongoDB Atlas      │
                                    │    (cloud.mongodb)    │
                                    └───────────────────────┘
```

- **前端**：Vue 3 + Vite + TypeScript，部署在 **Vercel**
- **后端**：NestJS 11 + Prisma 6，部署在 **Render**（新加坡节点）
- **数据库**：MongoDB Atlas 托管
- **AI 服务**：DeepSeek API
- **包管理**：npm workspaces（monorepo）

---

## 一、前置准备

| 依赖 | 说明 |
|------|------|
| GitHub 仓库 | 代码托管，关联 Vercel + Render |
| Vercel 账号 | 前端托管（免费） |
| Render 账号 | 后端托管（免费，512 MB / 0.1 vCPU） |
| MongoDB Atlas | 数据库（免费 M0 集群 512 MB） |
| DeepSeek API Key | AI 生成能力 |

---

## 二、Vercel 部署（前端）

### 2.1 部署配置

根目录 `vercel.json` 控制构建和路由：

```json
{
  "buildCommand": "npm run build -w frontend",
  "outputDirectory": "frontend/dist",
  "installCommand": "npm install",
  "framework": "vite",
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

### 2.2 操作步骤

1. 在 [Vercel](https://vercel.com) 点击 **New Project**
2. 导入 GitHub 仓库
3. **Framework Preset** 选择 **Vite**
4. **Root Directory** 保持为 `./`（仓库根目录）
5. 添加环境变量：

| Key | Value | 说明 |
|-----|-------|------|
| `VITE_API_BASE_URL` | `https://你的服务名.onrender.com/api` | 后端地址（运行时替换） |

6. 点击 **Deploy**

### 2.3 环境变量说明

前端 `src/api/common.ts` 中通过环境变量设置 API 地址：

```ts
const BASE = import.meta.env.VITE_API_BASE_URL || '/api';
```

- `VITE_` 前缀是 Vite 的约定，只有 `VITE_*` 变量会被暴露给浏览器
- 构建时注入，需在 Vercel 仪表板设置
- 未设置时回退到 `/api`（仅本地开发用）

---

## 三、Render 部署（后端）

### 3.1 Blueprint 部署（推荐）

通过仓库根目录的 `render.yaml`（Infrastructure as Code）一键部署：

```yaml
services:
  - type: web
    name: novelcraft-pro-server
    runtime: node
    region: singapore
    plan: free
    buildCommand: cd server && npm install && npx nest build && npx prisma generate && npx prisma db push
    startCommand: cd server && node dist/main
    envVars:
      - key: PORT
        value: "10000"
      - key: NODE_ENV
        value: production
      - key: DATABASE_URL
        sync: false
      - key: DEEPSEEK_API_KEY
        sync: false
      - key: CORS_ORIGIN
        sync: false
```

### 3.2 Node 版本

项目根目录 `.node-version` 指定 Node.js 版本：

```
22
```

Render 会自动读取该文件选择对应版本。

### 3.3 操作步骤

1. 在 [Render](https://render.com) 点击 **New → Blueprint**
2. 连接 GitHub 仓库，选择部署分支
3. Render 自动读取 `render.yaml` 创建服务
4. 服务创建后，进入 **Environment** 手动设置敏感变量：

| Key | Value | 说明 |
|-----|-------|------|
| `DATABASE_URL` | `mongodb+srv://user:pass@xxx.mongodb.net/novelcraft?retryWrites=true&w=majority` | MongoDB 连接 |
| `DEEPSEEK_API_KEY` | `sk-xxxxxxxx` | AI 密钥 |
| `CORS_ORIGIN` | `https://你的前端.vercel.app` | 允许的跨域来源 |

5. 首次部署后可能需要手动 **Deploy latest commit**

> **`sync: false` 含义**：这些变量不会从 `render.yaml` 同步。在仪表板修改后，后续部署不会覆盖它们。

### 3.4 构建流程

```
npm install（Render 默认，安装根依赖 + workspace 依赖）
    │
    ▼
cd server && npm install（在后端目录安装依赖）
    │
    ▼
npx nest build（编译 TypeScript → server/dist/）
    │
    ▼
npx prisma generate（生成 Prisma 客户端 + 下载 Linux 引擎二进制）
    │
    ▼
npx prisma db push（同步 Schema 到 MongoDB，创建集合和索引）
    │
    ▼
cd server && node dist/main（启动 NestJS 应用）
```

### 3.5 Prisma 配置要点

`schema.prisma` 中的关键配置：

```prisma
generator client {
  provider      = "prisma-client-js"
  binaryTargets = ["native", "debian-openssl-3.0.x"]  // Linux 兼容
}

datasource db {
  provider = "mongodb"
  url      = env("DATABASE_URL")
}
```

- `binaryTargets` 确保在 Linux（Debian）环境生成正确的 Prisma 引擎
- MongoDB 使用 `prisma db push` 同步 Schema（不需要 migration）

---

## 四、MongoDB Atlas 配置

### 4.1 创建免费集群

1. [MongoDB Atlas](https://cloud.mongodb.com) 注册/登录
2. 创建 **M0 Free** 集群，选择 **AWS / Singapore**（与 Render 同区域）
3. 在 **Database Access** 创建数据库用户
4. 在 **Network Access** 添加 `0.0.0.0/0`（允许所有 IP，Render 无固定 IP）

### 4.2 获取连接字符串

1. 点击 **Connect → Drivers**
2. 复制连接字符串，替换 `<password>` 和 `<dbname>`：

```
mongodb+srv://<user>:<password>@cluster0.xxxxx.mongodb.net/novelcraft?retryWrites=true&w=majority
```

---

## 五、CORS 配置

后端 `server/src/main.ts` 中的 CORS 设置：

```ts
app.enableCors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true,
});
```

- `CORS_ORIGIN` 设为 Vercel 前端完整域名（含 `https://`）
- 前端 API 请求通过 `VITE_API_BASE_URL` 指向后端地址

---

## 六、本地开发

```bash
# 1. 安装依赖（根目录）
npm install

# 2. 启动开发环境（前后端同时）
npm run dev          # concurrently 启动 server + frontend

# 或分别启动
npm run dev:server   # 后端 http://localhost:3000
npm run dev:frontend # 前端 http://localhost:5173
```

### 本地环境变量

后端 `server/.env`：

```
DATABASE_URL=mongodb+srv://...
DEEPSEEK_API_KEY=sk-...
```

前端 `frontend/.env.development`（可选，默认已走 Vite proxy）：

```
VITE_API_BASE_URL=/api
```

前端开发模式下通过 Vite proxy 将 `/api` 转发到 `localhost:3000`，无需跨域。

---

## 七、常见问题排查

### 7.1 Render 构建失败：`nest: not found`

原因：`@nestjs/cli`、`prisma`、`typescript` 必须在 `dependencies` 中（非 `devDependencies`），Render 生产构建时可能跳过 dev 依赖。

已修复：这些包已移至 `server/package.json` 的 `dependencies`。

### 7.2 Render 构建失败：Dockerfile 相关错误

原因：Render 服务类型选错。应使用 **Blueprint**（读取 `render.yaml`），而非 Docker 类型的 Web Service。

解决：删除现有服务，重新以 Blueprint 方式创建。

### 7.3 Render 构建失败：`nodeVersion not found`

`render.yaml` 不支持 `nodeVersion` 字段。改用 `.node-version` 文件指定。

### 7.4 启动后无响应 / CORS 错误

1. 确认 Render 仪表板中 `CORS_ORIGIN` 已设为 Vercel 域名
2. 确认 Vercel 仪表板中 `VITE_API_BASE_URL` 已设为 Render 域名
3. Render 免费实例 15 分钟无访问会休眠，首次请求需要 30-60 秒唤醒

### 7.5 MongoDB 连接失败

1. Atlas Network Access 是否添加了 `0.0.0.0/0`
2. `DATABASE_URL` 中的用户名密码是否转义特殊字符
3. Render 日志中查看具体错误：`Dashboard → Logs`

### 7.6 Prisma generate 失败（本地 Windows）

Windows 上文件锁定导致 `EPERM` 错误，关闭占用进程后重试：

```bash
taskkill /f /im node.exe
npm run build -w server
```

---

## 八、相关文件索引

| 文件 | 用途 |
|------|------|
| `vercel.json` | Vercel 构建与路由配置 |
| `render.yaml` | Render Blueprint 部署配置 |
| `.node-version` | 指定 Node.js 22 |
| `server/package.json` | 后端依赖与构建脚本 |
| `server/prisma/schema.prisma` | 数据库 Schema（含 Linux 二进制目标） |
| `server/src/main.ts` | NestJS 入口（CORS + 路由前缀） |
| `frontend/.env.production` | 前端生产环境变量模板 |
| `frontend/vite.config.ts` | Vite 开发代理配置 |
| `frontend/src/api/common.ts` | API 请求封装（BASE URL 配置） |
