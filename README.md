# JustOne AI

**个人优先级对齐工具** — 基于 Gemini AI 的 1-3-5 任务管理系统。

> 每天只做一件最重要的事。

---

## 功能

### 核心工作流

- **长期愿景** → **中期里程碑** → **今日收集箱** → **AI 对齐分析** → **1-3-5 聚焦看板**
- 每天打开 App 自动触发 AI 分析（当天仅分析一次，避免重复调用）
- 手动点击可随时重新分析

### AI 对齐分析

- 接入 Google Gemini 2.5 Flash
- 对齐算法：`S = 0.5×A_vision + 0.3×A_milestone - 0.2×T_drag`
- 输出：1 个 Must-Do、3 个 Should-Do、5 个 Could-Do、3 条今日拒绝规则
- 支持自定义 API Endpoint（代理）

### 任务采集

- **快速添加**：标题、备注、Why 锚点、预估用时、关联里程碑
- **引导采集**：GTD 6 维度触发清单（工作 / 沟通 / 财务 / 学习 / 生活 / 大脑碎片）
- **任务模板**：常用任务一键加入收集箱，支持批量添加

### 执行看板

- Must-Do 大卡片，完成后触发打卡动效
- 完成 Must 任务后提示记录实际用时
- 拖延预警：≥3天琥珀色警告，≥7天红色警示
- Why 锚点：执行时显示「这件事为什么重要」
- 一键延续昨天未完成的任务

### 数据与统计

- **今日战报**：实时分数（Must=50分、Should=10分/个、Could=4分/个）+ S/A/B/C 评级
- **连胜系统**：Must-Do 连续完成天数，3/7/14/30 天里程碑
- **晨间仪式**：每天首次打开展示当日大事 + 连胜状态
- **晚间复盘**：专注度评分、两道反思题、AI Coach 每日诊断
- **每周报告**：完胜率、专注曲线、拖延洞察、AI 诊断归档（周五自动弹出）
- **历史看板**：折线图 + 柱状图 + AI 诊断时间轴

### 时间追踪

- 添加任务时填写预估用时（15min 快捷预设）
- 完成任务后记录实际用时
- 自动计算准确率（实际/预估%）
- 数据积累后可校准个人执行系数

### 多用户 & 数据安全

- 邮箱注册 + 密码登录，支持邮箱验证（Resend SMTP）
- 每个用户数据完全隔离（PocketBase Rules 服务端强制过滤）
- 数据存储在自部署的 PocketBase 实例，不经过任何第三方
- 支持一键导出全部数据为 JSON

---

## 技术栈

| 层 | 技术 |
|---|---|
| 前端 | React 18 + TypeScript + Vite 8 |
| UI | Tailwind CSS + shadcn/ui + Lucide React |
| 图表 | Recharts |
| 数据库 | PocketBase 0.23（SQLite，单二进制） |
| AI | Google Gemini 2.5 Flash API |
| 测试 | Vitest 4 |

---

## 快速开始

### 环境要求

- Node.js 18+
- pnpm

### 安装

```bash
git clone https://github.com/qijinhaocode/just-one.git
cd just-one
pnpm install
```

### 启动

需要两个终端：

```bash
# 终端 1：启动数据库
./start-pb.sh

# 终端 2：启动前端
pnpm dev
```

打开 `http://localhost:5173`，注册账号后即可使用。

### 初次配置

1. 注册账号（邮箱 + 密码）
2. 右上角「API 配置」填入 Gemini API Key
3. 创建长期愿景 → 中期里程碑 → 在收集箱添加任务 → AI 自动分析

---

## 部署到服务器

### PocketBase

```bash
# 传二进制到服务器
scp pocketbase/pocketbase user@your-server:~/justone/

# 服务器上启动（用 pm2 保持后台运行）
pm2 start ./justone/pocketbase -- serve \
  --http=0.0.0.0:8090 \
  --dir=./justone/pb_data \
  --migrationsDir=./justone/pb_migrations
```

### 前端

```bash
pnpm build
# 将 dist/ 目录部署到 Nginx / Vercel / Cloudflare Pages 等
```

前端连接自定义 PocketBase 地址（在浏览器 Console 执行一次）：

```js
localStorage.setItem('pb_url', 'https://your-server.com:8090')
```

### 邮件验证（可选，使用 Resend）

1. 在 [resend.com](https://resend.com) 注册，获取 API Key（`re_` 开头）
2. 打开 PocketBase Admin UI：`http://your-server:8090/_/`
3. **Settings → Mail settings**：
   ```
   Sender name:   JustOne AI
   Sender email:  onboarding@resend.dev
   SMTP host:     smtp.resend.com
   SMTP port:     465
   Username:      resend
   Password:      re_你的APIKey
   TLS:           ✅
   ```
4. **Settings → Auth → users → Require email verification**: ✅

---

## PocketBase 管理

| 操作 | 地址 |
|---|---|
| Admin UI | `http://localhost:8090/_/` |
| 默认账号 | `admin@justone.local` / `justone2024` |
| API 文档 | `http://localhost:8090/api/` |

> 生产环境请修改默认管理员密码。

---

## 数据库迁移记录

| 版本 | 内容 |
|---|---|
| 1 | 初始化：visions / milestones / tasks / daily_reviews |
| 2 | tasks 表加 `why` 字段 |
| 3 | 新增 task_templates 表 |
| 4 | daily_reviews 表加 `ai_analyzed_at` 字段 |
| 5 | tasks 表加 `estimatedMinutes` / `actualMinutes` 字段 |
| 6 | 所有表加 `user` 关联字段 + 访问权限规则 |

---

## 开发

```bash
pnpm dev          # 开发服务器
pnpm build        # 生产构建
pnpm test         # 运行测试（15 个单元测试）
```

### 目录结构

```
src/
├── components/
│   ├── ui/           # shadcn/ui 基础组件
│   ├── AuthPage.tsx
│   ├── Navbar.tsx
│   ├── Sidebar.tsx
│   ├── VisionPanel.tsx
│   ├── MilestonePanel.tsx
│   ├── InboxPanel.tsx
│   ├── FocusBoard.tsx
│   ├── EveningReview.tsx
│   ├── Dashboard.tsx
│   ├── GuidedCapture.tsx
│   ├── TaskTemplates.tsx
│   ├── MorningRitual.tsx
│   ├── WeeklyReport.tsx
│   ├── StreakAndScore.tsx
│   └── CarryOverBanner.tsx
├── services/
│   ├── pb.ts         # PocketBase 服务层（含认证）
│   ├── gemini.ts     # Gemini AI 对齐引擎
│   └── streak.ts     # 连胜计算逻辑
├── hooks/
│   └── usePB.ts      # PocketBase 实时订阅 Hook
└── lib/
    └── utils.ts      # cn() 工具函数
pocketbase/
└── pb_migrations/    # 数据库迁移文件
```

---

## License

MIT
