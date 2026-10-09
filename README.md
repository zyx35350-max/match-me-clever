# Solstice — AI 求职工作台

Solstice 是一个面向个人求职者的 AI 求职工作台，包含职业画像、岗位匹配、今日推荐、岗位详情、收藏和求职活动记录。界面以中文为主。

## 本地运行

需要安装 **Node.js 22 LTS**（建议）和 npm。

```bash
git clone https://github.com/zyx35350-max/match-me-clever.git
cd match-me-clever
git fetch origin
git switch ui/solstice-frosted-brand-system
npm ci
npm run dev
```

启动后，按终端提示在浏览器打开本地地址。开发服务器通常会使用 `http://localhost:3000`，如果端口被占用，以终端输出为准。

## 检查代码

```bash
npm run build
npm run lint
npx tsc --noEmit
```

如果检查命令报告错误，请保留完整报错信息；不要因为开发服务器能打开就认为构建和类型检查均已通过。

## 登录与云端数据

项目使用 Supabase 处理邮箱账号、职业画像和云端工作台数据。客户端配置位于 `src/lib/supabase.ts`，默认读取 `VITE_SUPABASE_URL` 和 `VITE_SUPABASE_PUBLISHABLE_KEY`；若未设置，会使用代码内配置的默认 Supabase 项目。

- 若你使用自己的 Supabase 项目，请在项目根目录创建本地 `.env.local`，填写自己的 `VITE_SUPABASE_URL` 和 `VITE_SUPABASE_PUBLISHABLE_KEY`。
- 不要把服务端密钥、数据库密码或其他私密凭据提交到 GitHub。
- 邮箱注册、登录、职业画像保存以及云端工作台同步，需要 Supabase 项目中的数据库表、RLS 权限策略和 Auth 邮件设置与代码匹配。仅能打开本地页面，不代表这些云端流程已验证通过。
- Gemini 相关服务端能力可按需设置 `GEMINI_API_KEY`；不要把服务端 API key 暴露给浏览器端。

## 项目状态

本仓库的 Solstice 品牌样式工作仍在独立分支 `ui/solstice-frosted-brand-system` 的 Draft PR 中，尚未合并到默认分支。请先切换到该分支再进行本地验证。
