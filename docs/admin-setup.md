# Firefly 博客管理后台部署指南

后台页面位于 `/admin/`，API 位于 `/api/admin/*`。普通博客请求仍由 Cloudflare 静态资源直接处理。

## 已实现的功能

- 用户名和密码登录、七天会话、退出登录、登录失败锁定。
- 首位管理员一次性初始化。
- 文章列表、搜索、新建、编辑、草稿、发布和删除。
- Markdown 实时预览，文章 Frontmatter 表单化编辑。
- 标题图上传、资源列表、复制地址、设为封面和删除。
- GitHub 提交发布、最近提交状态和操作审计。
- 桌面端与移动端后台布局。

## 一、安装依赖

```bash
pnpm install
```

## 二、创建 D1 数据库

```bash
pnpm wrangler login
pnpm wrangler d1 create firefly-admin --location apac
```

命令会输出 `database_id`。将 `wrangler.toml` 末尾的 `[[d1_databases]]` 配置取消注释，并填写真实 ID：

```toml
[[d1_databases]]
binding = "DB"
database_name = "firefly-admin"
database_id = "你的 database_id"
migrations_dir = "migrations"
```

应用数据库迁移：

```bash
pnpm wrangler d1 migrations apply firefly-admin --remote
```

## 三、绑定图片存储

如果 `img.eysnter.cn` 已经使用 R2，请直接填写对应桶名；否则创建新桶：

```bash
pnpm wrangler r2 bucket create firefly-media --location apac
```

在 `wrangler.toml` 中启用：

```toml
[[r2_buckets]]
binding = "MEDIA"
bucket_name = "firefly-media"
```

需要在 Cloudflare R2 设置中把 `img.eysnter.cn` 连接到这个桶。后台默认把图片存入：

```text
file/posts/Title/<时间戳>_<文件名>.<扩展名>
```

如果图床根地址不同，请修改 `MEDIA_PUBLIC_BASE`。

## 四、创建 GitHub 细粒度令牌

为 `Eysnter/my-blog` 创建 Fine-grained personal access token，只开放：

- Repository access：仅 `my-blog`
- Contents：Read and write
- Metadata：Read-only

不要把令牌写入代码或 `wrangler.toml`，使用 Worker Secret：

```bash
pnpm wrangler secret put GITHUB_TOKEN
```

## 五、设置后台安全密钥

生成三个互不相同的随机值，并分别写入 Secret：

```bash
pnpm wrangler secret put PASSWORD_PEPPER
pnpm wrangler secret put ADMIN_SETUP_TOKEN
```

- `PASSWORD_PEPPER`：密码哈希的服务端额外密钥，部署后不要随意更换。
- `ADMIN_SETUP_TOKEN`：只在首次创建管理员时使用。

如需启用登录人机验证，再配置：

```bash
pnpm wrangler secret put TURNSTILE_SECRET_KEY
```

## 六、构建与部署

```bash
pnpm build
pnpm wrangler deploy
```

部署后打开：

```text
https://blog.eysnter.cn/admin/
```

第一次会显示“创建首位管理员”，输入：

1. `ADMIN_SETUP_TOKEN` 的值；
2. 需要使用的用户名；
3. 至少 12 个字符的管理员密码。

创建成功后初始化接口会自动拒绝再次创建用户。确认能够登录后，可以删除初始化密钥：

```bash
pnpm wrangler secret delete ADMIN_SETUP_TOKEN
```

## 七、本地开发

复制示例文件并生成仅用于本机的随机值。`.dev.vars` 已加入 Git 忽略规则：

```bash
cp .dev.vars.example .dev.vars
```

文件内容如下：

```dotenv
PASSWORD_PEPPER=仅用于本地开发的随机值
ADMIN_SETUP_TOKEN=仅用于本地开发的一次性令牌
GITHUB_TOKEN=你的开发令牌
```

先应用本地迁移，再运行 Worker：

```bash
pnpm admin:migrate:local
pnpm admin:dev
```

## 安全说明

- 密码使用 PBKDF2-HMAC-SHA256、独立随机盐、服务端 Pepper 和 Cloudflare Workers 支持的 100,000 次迭代保存。
- 会话令牌只通过 `HttpOnly + Secure + SameSite=Strict` Cookie 发送。
- D1 只保存会话令牌的 SHA-256 哈希。
- 写操作要求同源请求和 CSRF 令牌。
- GitHub Token、密码 Pepper 和初始化令牌不会发送到浏览器。
- 连续五次登录失败会锁定十五分钟。
- 生产环境建议再用 Cloudflare Access 保护 `/admin/*` 与 `/api/admin/*`。
