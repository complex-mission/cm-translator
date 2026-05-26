<div align="center">

# CM Translator

**基于 DeepSeek V4 Flash 的 AI 翻译 Web 应用**

流式响应 · 实时翻译 · 20+ 语种 · 翻译历史 · 管理后台 · 四国语言界面

[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5-3178C6?logo=typescript)](https://www.typescriptlang.org/)
[![Prisma](https://img.shields.io/badge/Prisma-6-2D3748?logo=prisma)](https://www.prisma.io/)
[![MySQL](https://img.shields.io/badge/MySQL-8.0-4479A1?logo=mysql)](https://www.mysql.com/)
[![Redis](https://img.shields.io/badge/Redis-7-DC382D?logo=redis)](https://redis.io/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3-06B6D4?logo=tailwindcss)](https://tailwindcss.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](./LICENSE)

</div>

---

## 功能特性

<table>
<tr>
<td width="50%">

### 翻译核心
- **流式输出** — SSE 实时推送，首字延迟 < 500ms
- **5 种翻译模式** — 通用 / 技术文档 / 学术论文 / 口语化 / 文学翻译
- **20+ 语种** — 自动检测源语言，一键切换目标语言
- **快捷键支持** — `Ctrl/Cmd + Enter` 立即翻译
- **一键复制** — 译文秒复制，带视觉反馈
- **停止生成** — 随时中断流式输出

</td>
<td width="50%">

### 用户系统
- **邮箱注册** — 验证码激活，bcrypt 密码哈希（cost 12）
- **双 Token 会话** — Access Token JWT (7天) + 不透明 Refresh Token (30天，SHA-256 索引查找)
- **30 个默认头像** — 注册随机分配，个人中心随时切换
- **隐私模式** — 开启后不存储原文与译文
- **密码找回** — 邮箱验证码重置，10 分钟有效，5 次错误锁定
- **密码强度提示** — 实时检测并反馈

</td>
</tr>
<tr>
<td>

### 翻译历史
- **自动记录** — 每次翻译异步入库，不阻塞响应
- **全文搜索** — MySQL FULLTEXT + ngram 分词，支持中文
- **多维筛选** — 语言对、日期范围、关键词
- **批量操作** — 勾选删除、按时间段清空
- **三种导出** — JSON / CSV / Markdown 格式
- **载入编辑** — 历史记录一键回到翻译框继续

</td>
<td>

### 管理后台
- **用户管理** — 搜索、封禁/解封、调整配额、强制下线
- **记录审计** — 全局翻译记录浏览、全文检索、敏感标记
- **用量统计** — 日活、注册数、翻译次数、Token 消耗、成本估算
- **系统配置** — 模型参数、配额规则、SMTP、公告栏
- **审计日志** — 所有管理员操作留痕

</td>
</tr>
<tr>
<td>

### 安全与配额
- **原子配额** — Redis `INCR` 保证并发场景下无超用，游客 10/天 · 用户 200/天
- **速率限制** — Redis 滑动窗口 + Lua 原子脚本，用户 30/分钟 · 游客 10/分钟
- **Token 安全** — Refresh Token 仅存 SHA-256 哈希，O(1) 查找；旋转 + 撤销机制
- **启动期强校验** — 缺失 `JWT_SECRET` / `DATABASE_URL` 直接拒绝启动
- **Prompt 注入防护** — 用户输入隔离包装
- **HTTPS 强制** — 全链路加密传输

</td>
<td>

### 界面体验
- **暗色模式** — 跟随系统或手动切换
- **响应式布局** — 桌面优先，兼容平板和手机
- **流式动画** — 译文淡入效果，打字机体验
- **极简设计** — 对标 DeepL / Linear 的视觉质感
- **自适应输入框** — 随内容自动伸缩
- **SVG 图标** — 全局使用 Lucide React 矢量图标，无 Emoji

</td>
</tr>
<tr>
<td colspan="2">

### 多语言界面 (i18n)
- **四国语言** — 支持 English / 中文 / 日本語 / 한국어
- **浏览器语言检测** — 首次访问自动匹配浏览器语言偏好
- **手动切换** — 顶部导航栏 Globe 图标一键切换语言
- **持久化存储** — 用户语言偏好保存至 localStorage
- **全覆盖** — 登录、注册、翻译、历史、个人中心、管理后台全部四语支持

</td>
</tr>
</table>

---

## 技术栈

| 层级 | 技术 | 用途 |
|------|------|------|
| **框架** | Next.js 16 (App Router) | SSR / API Routes / 中间件 |
| **前端** | React 19 + Tailwind CSS | 组件化 UI + 原子化样式 |
| **语言** | TypeScript 5.5 | 全栈类型安全 |
| **数据库** | MySQL 8.0+ | 持久化存储 |
| **ORM** | Prisma 6 | 类型安全的数据库访问 |
| **缓存** | Redis 7 (ioredis) | 速率限制 / 滑动窗口 / 日配额 |
| **认证** | JWT (jose) + bcryptjs + crypto.randomBytes | Access Token JWT + 不透明 Refresh Token |
| **AI 模型** | DeepSeek V4 Flash | 流式翻译引擎 |
| **校验** | Zod | 请求参数验证 |
| **图标** | Lucide React | SVG 矢量图标 |
| **国际化** | 自研 i18n (React Context) | EN / ZH / JA / KO 四语言 |

---

## 快速开始

### 环境要求

- **Node.js** ≥ 18
- **MySQL** ≥ 8.0
- **Redis** ≥ 6.0
- **DeepSeek API Key** — [获取地址](https://platform.deepseek.com/)

### 1. 克隆项目

```bash
git clone https://github.com/your-username/cm-translator.git
cd cm-translator
```

### 2. 安装依赖

```bash
npm install
```

### 3. 配置环境变量

```bash
cp .env.example .env
```

编辑 `.env`，填入以下配置：

```env
# 数据库
DATABASE_URL="mysql://root:password@localhost:3306/ai_translator"

# Redis（缺失则回退到单实例内存限流/配额，仅适合单进程开发环境）
REDIS_URL="redis://localhost:6379"

# JWT 签名密钥（≥32 字符，建议 64+，推荐：openssl rand -base64 48）
JWT_SECRET="your-random-64-char-secret-here"

# DeepSeek API
DEEPSEEK_API_KEY="sk-your-api-key-here"
DEEPSEEK_BASE_URL="https://api.deepseek.com"
DEEPSEEK_MODEL="deepseek-v4-flash"

# 应用地址
NEXT_PUBLIC_APP_URL="http://127.0.0.1:65108"
```

> Refresh Token 现在为高熵随机字符串（base64url，48 字节），仅在数据库中存储其 SHA-256 哈希，无需独立签名密钥。

### 4. 初始化数据库

```bash
# 生成 Prisma Client
npx prisma generate

# 同步表结构到 MySQL
npx prisma db push

# 种子数据（管理员 + 测试账号 + 系统配置）
npx tsx prisma/seed.ts
```

### 5. 启动

```bash
npm run build
npm start
```

`npm start` 会自动执行以下步骤：
1. 同步数据库表结构 (`prisma db push`)
2. 创建默认管理员和测试账号 (`prisma/seed.ts`)
3. 启动 Next.js 服务

访问 [http://127.0.0.1:65108](http://127.0.0.1:65108)

> 开发模式使用 `npm run dev`，但不会自动同步数据库，需手动执行 `npm run db:push && npm run db:seed`。

### 默认账号

| 角色 | 邮箱 | 密码 |
|------|------|------|
| 管理员 | `admin@example.com` | `Admin@123` |
| 测试用户 | `test@example.com` | `Test@1234` |

---

## 项目结构

```
cm-translator/
│
├── app/                              # Next.js App Router
│   ├── api/                          # API 路由
│   │   ├── auth/                     #   认证相关
│   │   │   ├── register/             #     POST 注册
│   │   │   ├── login/                #     POST 登录
│   │   │   ├── refresh/              #     POST Token 续签
│   │   │   ├── logout/               #     POST 登出
│   │   │   ├── me/                   #     GET/PATCH 用户信息
│   │   │   └── change-password/      #     POST 修改密码
│   │   ├── translate/                #   翻译相关
│   │   │   ├── stream/               #     POST 流式翻译 (SSE)
│   │   │   ├── history/              #     GET/DELETE 翻译记录
│   │   │   └── export/               #     GET 导出 (JSON/CSV/MD)
│   │   └── admin/                    #   管理后台
│   │       ├── stats/                #     GET 仪表盘统计
│   │       ├── users/                #     GET/PATCH 用户管理
│   │       └── records/              #     GET 记录审计
│   │
│   ├── auth/                         # 认证页面
│   │   ├── login/page.tsx            #   登录页 (i18n)
│   │   └── register/page.tsx         #   注册页 (i18n)
│   ├── history/page.tsx              # 翻译历史页 (i18n)
│   ├── profile/page.tsx              # 个人中心页 (i18n)
│   ├── admin/                        # 管理后台页面
│   │   ├── page.tsx                  #   仪表盘 (i18n + SVG)
│   │   ├── users/page.tsx            #   用户管理 (i18n)
│   │   └── records/page.tsx          #   记录审计 (i18n + SVG)
│   │
│   ├── globals.css                   # 全局样式 + CSS 变量
│   ├── layout.tsx                    # 根布局
│   └── page.tsx                      # 首页（翻译主界面，i18n）
│
├── components/                       # React 组件
│   ├── AuthProvider.tsx              # 认证上下文 + useAuth Hook
│   ├── ThemeProvider.tsx             # 主题切换 (亮/暗/跟随系统)
│   ├── Header.tsx                    # 顶部导航栏 + 语言切换器 + 用户菜单
│   └── TranslatePanel.tsx            # 翻译核心面板 (i18n + SVG)
│
├── lib/                              # 工具库
│   ├── auth.ts                       # Access Token JWT + 不透明 Refresh Token + 密码哈希
│   ├── db.ts                         # Prisma 客户端单例
│   ├── deepseek.ts                   # DeepSeek API 封装 (流式 + 同步)
│   ├── i18n.tsx                      # i18n 系统 (I18nProvider / useI18n / 四语翻译)
│   ├── middleware.ts                 # 认证助手 + 头像工具
│   ├── redis.ts                      # Lua 滑动窗口限流 + 原子配额消费
│   └── validations.ts                # Zod 校验 Schema
│
├── prisma/
│   ├── schema.prisma                 # 数据库模型定义
│   └── seed.ts                       # 种子数据脚本
│
├── public/
│   └── avatar/                       # 30 个默认头像
│       ├── a-01.webp ~ a-10.webp     #   Pixelscape 像素风景
│       ├── a-11.webp ~ a-20.webp     #   Wave 浮世绘波浪
│       └── a-21.webp ~ a-30.webp     #   Monster 像素小怪物
│
├── middleware.ts                     # Next.js 中间件 (安全头)
├── next.config.js                    # Next.js 配置
├── tailwind.config.js                # Tailwind CSS 配置
├── tsconfig.json                     # TypeScript 配置
└── .env.example                      # 环境变量模板
```

---

## API 文档

### 认证

| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| `POST` | `/api/auth/register` | 注册 | ❌ |
| `POST` | `/api/auth/login` | 登录 | ❌ |
| `POST` | `/api/auth/refresh` | 续签 Token | Cookie |
| `POST` | `/api/auth/logout` | 登出 | Cookie |
| `GET` | `/api/auth/me` | 获取当前用户 | Cookie |
| `PATCH` | `/api/auth/me` | 更新资料 | Cookie |
| `POST` | `/api/auth/change-password` | 修改密码 | Cookie |

### 翻译

| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| `POST` | `/api/translate/stream` | 流式翻译 (SSE) | 可选 |
| `GET` | `/api/translate/history` | 翻译历史列表 | Cookie |
| `DELETE` | `/api/translate/history` | 删除记录 | Cookie |
| `GET` | `/api/translate/export` | 导出翻译记录 | Cookie |

### 管理员

| 方法 | 路径 | 说明 | 权限 |
|------|------|------|------|
| `GET` | `/api/admin/stats` | 仪表盘统计 | admin |
| `GET` | `/api/admin/users` | 用户列表 | admin |
| `PATCH` | `/api/admin/users` | 更新用户状态 | admin |
| `GET` | `/api/admin/records` | 翻译记录审计 | admin |

### 请求示例

**翻译 (SSE 流式)**

```bash
curl -N -X POST http://127.0.0.1:65108/api/translate/stream \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Hello, world!",
    "sourceLang": "en",
    "targetLang": "zh",
    "mode": "general"
  }'
```

响应 (Server-Sent Events):

```
data: {"content":"你"}
data: {"content":"好"}
data: {"content":"，"}
data: {"content":"世界"}
data: {"content":"！"}
data: {"done":true,"tokensUsed":12,"latencyMs":320,"translation":"你好，世界！"}
```

**注册**

```bash
curl -X POST http://127.0.0.1:65108/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"MyPass123","nickname":"User"}'
```

---

## 数据模型

```mermaid
erDiagram
    users ||--o{ translations : has
    users ||--o{ refresh_tokens : has
    users ||--o{ glossaries : has
    users ||--o{ usage_stats : has

    users {
        bigint id PK
        varchar email UK
        datetime email_verified_at
        varchar password_hash
        varchar nickname
        tinyint avatar_id "1-30"
        enum role "user|admin"
        enum status "active|banned|deleted"
        int daily_quota
        boolean privacy_mode
    }

    translations {
        bigint id PK
        bigint user_id FK
        varchar source_lang
        varchar target_lang
        mediumtext source_text
        mediumtext translated_text
        varchar mode
        varchar model
        int tokens_used
        int latency_ms
        boolean flagged
    }

    refresh_tokens {
        bigint id PK
        bigint user_id FK
        varchar token_hash
        datetime expires_at
        datetime revoked_at
    }

    glossaries {
        bigint id PK
        bigint user_id FK
        varchar source_term
        varchar target_term
        varchar lang_pair
    }

    usage_stats {
        bigint id PK
        bigint user_id FK
        date date
        int count
        int tokens
    }

    audit_logs {
        bigint id PK
        bigint admin_id
        varchar action
        varchar target_type
        json payload
    }

    system_configs {
        bigint id PK
        varchar config_key UK
        text config_value
    }
```

---

## 支持语言

### 界面语言 (UI)

| 语言 | Code | 说明 |
|------|------|------|
| English | `en` | 英语 (默认) |
| 中文 | `zh` | 简体中文 |
| 日本語 | `ja` | 日语 |
| 한국어 | `ko` | 韩语 |

> 首次访问自动检测浏览器语言偏好，用户可通过顶部导航栏 Globe 图标随时切换。

### 翻译语言

| 语言 | Code | 语言 | Code |
|------|------|------|------|
| 自动检测 | `auto` | 中文 | `zh` |
| English | `en` | 日本語 | `ja` |
| 한국어 | `ko` | Français | `fr` |
| Deutsch | `de` | Español | `es` |
| Português | `pt` | Русский | `ru` |
| العربية | `ar` | Italiano | `it` |
| Nederlands | `nl` | Polski | `pl` |
| ไทย | `th` | Tiếng Việt | `vi` |
| Bahasa Indonesia | `id` | Türkçe | `tr` |
| हिन्दी | `hi` | Українська | `uk` |

---

## 头像系统

系统提供 **30 个默认头像**，注册时随机分配，用户可在个人中心切换。

| 编号 | 文件名 | 说明 |
|------|--------|------|
| 1 - 10 | `a-01.webp` ~ `a-10.webp` | Pixelscape 像素风景 |
| 11 - 20 | `a-11.webp` ~ `a-20.webp` | Wave 浮世绘波浪 |
| 21 - 30 | `a-21.webp` ~ `a-30.webp` | Monster 像素小怪物 |

> 头像文件名约定为 `a-{id}.webp`，`id` 范围 1-30。部署前请将素材放入 `public/avatar/` 目录。

---

## 环境变量

| 变量 | 必填 | 默认值 | 说明 |
|------|:----:|--------|------|
| `DATABASE_URL` | ✅ | — | MySQL 连接串 |
| `REDIS_URL` | ✅ | — | Redis 连接地址 |
| `JWT_SECRET` | ✅ | — | Access Token 签名密钥（≥32 字符，启动时强校验） |
| `DEEPSEEK_API_KEY` | ✅ | — | DeepSeek API Key |
| `DEEPSEEK_BASE_URL` | ❌ | `https://api.deepseek.com` | API 基础地址 |
| `DEEPSEEK_MODEL` | ❌ | `deepseek-v4-flash` | 模型名称 |
| `NEXT_PUBLIC_APP_URL` | ❌ | `http://127.0.0.1:65108` | 应用公开地址 |

---

## 安全设计

### Token 与会话
- **Access Token**：JWT (HS256)，载荷仅含 `sub` 和 `role`，TTL 7 天，存放于 `HttpOnly` Cookie。
- **Refresh Token**：`crypto.randomBytes(48)` 生成的 base64url 字符串（≈384 bit 熵），明文仅返回给客户端；服务端只存 SHA-256 哈希值并对哈希列建唯一索引，登录验证为 O(1) 查找。Cookie 限定 `Path=/api/auth`，避免在普通 API 中泄露。
- **轮换 (Rotation)**：每次 `/api/auth/refresh` 调用都会撤销旧 Refresh Token 并签发新对，泄露的 token 被使用一次后即作废。
- **强制启动校验**：缺失或长度不足 32 的 `JWT_SECRET` 会让进程在启动阶段直接抛错退出。

### 限流与配额
- **滑动窗口限流**：Redis 的 `EVAL` Lua 脚本原子执行 `ZREMRANGEBYSCORE → ZCARD → ZADD`，避免被拒请求污染窗口计数。
- **每日配额**：`INCR` + 超额回滚 (`DECR`)，并发安全；无 Redis 时回退到单进程内存实现。
- **Token 计数与配额计数分离**：配额前置原子消费用于准入控制，Token 用量在翻译完成后异步累计。

### 数据保护
- 密码：bcrypt cost 12（注册）/ cost 10（验证码）。
- 翻译记录：用户开启隐私模式后 `source_text` / `translated_text` 写入为 `NULL`，仅保留元数据。
- 邮箱验证码：哈希存储，5 次错误锁定，单次有效。

### 从旧版本升级
本次更新调整了 `refresh_tokens.token_hash` 的存储方式（从 bcrypt 改为 SHA-256）并加上了唯一约束。升级步骤：

```bash
# 撤销所有现存会话（推荐，避免数据混用）
mysql> TRUNCATE TABLE refresh_tokens;

# 同步新 schema
npx prisma db push
```

升级后所有用户需重新登录。同时移除了 `JWT_REFRESH_SECRET` 环境变量。

---

## 部署

### Docker Compose (推荐)

```yaml
version: '3.8'
services:
  app:
    build: .
    ports:
      - "65108:65108"
    environment:
      - DATABASE_URL=mysql://root:password@db:3306/ai_translator
      - REDIS_URL=redis://redis:6379
      - JWT_SECRET=your-secret
      - DEEPSEEK_API_KEY=sk-your-key
    depends_on:
      - db
      - redis

  db:
    image: mysql:8.0
    environment:
      MYSQL_ROOT_PASSWORD: password
      MYSQL_DATABASE: ai_translator
    volumes:
      - mysql_data:/var/lib/mysql

  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data

volumes:
  mysql_data:
  redis_data:
```

### Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/your-username/cm-translator)

> Vercel 部署需使用外部 MySQL (如 PlanetScale / TiDB) 和外部 Redis (如 Upstash)。

### 手动部署

```bash
# 构建
npm run build

# 启动 (PM2)
pm2 start npm --name "translator" -- start
```

---

## 贡献

欢迎提交 Issue 和 Pull Request！

1. Fork 本仓库
2. 创建功能分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'Add amazing feature'`)
4. 推送分支 (`git push origin feature/amazing-feature`)
5. 开启 Pull Request

---

## 许可证

[MIT License](./LICENSE) © 2026

---

<div align="center">

**如果这个项目对你有帮助，请给一个 Star！**

</div>
