# Chenify API 文档

## 概述

- 服务基于 `Bun.serve`，监听端口 **8080**
- 所有业务接口路径前缀为 `/api`，静态资源前缀为 `/uploads/`
- 请求体两种格式：
  - `application/json`：登录、评论、隐私设置等
  - `multipart/form-data`：注册（含可选头像）、发帖、草稿、作品（含文件上传）
- 认证方式：`Authorization: Bearer <JWT>` 请求头
  - JWT 算法 HS256，默认有效期 **7 天**（`JwtPayload`：`sub`、`username`、`email`、`iat`、`exp`）
  - 未携带或非法 Token 时，接口按「未登录」处理；明确需要登录的接口返回 401

### 统一错误格式

```json
{ "message": "错误描述" }
```

常见状态码：

| 状态码 | 含义 |
| ------ | ---- |
| 400 | 参数缺失或不合法（含上传限制、不能关注自己等） |
| 401 | 未登录 / Token 无效 / 用户名或密码错误 |
| 403 | 无权限（非本人帖/评论/草稿/作品） |
| 404 | 资源不存在（帖子、用户、草稿、作品等） |
| 409 | 资源冲突（邮箱/用户名已被注册） |
| 500 | 服务端处理失败 |

## 通用约定

### 分页参数

列表类接口均支持以下查询参数：

| 参数 | 默认值 | 说明 |
| ---- | ------ | ---- |
| `offset` | `0` | 偏移量，最小 0 |
| `limit` | `20` | 每页数量，范围 1–50（帖子列表默认 20；评论、个人空间列表默认 20 上限 50） |

### 上传限制一览

| 资源 | 大小限制 | 格式 | 数量限制 | 处理 |
| ---- | -------- | ---- | -------- | ---- |
| 注册头像 | 2MB | png / jpg / webp / gif | 1 张 | 缩放至 ≤512px，转 webp（80 质量，gif 原样保留） |
| 帖子/草稿图片 | 2MB | png / jpg / webp / gif | 最多 9 张 | 转 webp（80 质量，gif 原样保留） |
| 作品文件 | 1MB | 任意（扩展名白名单校验） | 最多 20 个 | 原样存储 |
| 作品封面 | 2MB | png / jpg / webp / gif | 1 张 | 拉伸至 1280×853（3:2），转 webp（80 质量，gif 原样保留） |

- 文本长度限制：
  - 帖子 / 草稿内容：≤ 20000 字
  - 评论：≤ 5000 字
  - 作品简介：≤ 5000 字
  - 作品标题：≤ 100 字符
  - 标签：最多 10 个，单个 ≤ 20 字符（逗号/空格分隔，自动去重、转小写）
- ID 参数须为正整数，否则返回 400「无效的 ID」

## 接口说明

### 一、认证（Passport）

#### 注册

`POST /api/passport/register`

无需登录。请求体为 `multipart/form-data`：

| 字段 | 类型 | 必填 | 说明 |
| ---- | ---- | ---- | ---- |
| `username` | string | 是 | 2–32 个字符 |
| `email` | string | 是 | 邮箱格式校验 |
| `password` | string | 是 | 至少 6 位 |
| `avatar` | File | 否 | 头像图片，受限同上传一览表 |

成功返回 `201`：

```json
{
  "id": 1,
  "username": "chenify",
  "email": "chenify@example.com",
  "avatar": "/uploads/xxxx.webp",
  "created_at": "2026-08-10 12:00:00"
}
```

错误：`400` 必填项缺失/格式不合法，`409` 邮箱或用户名已被注册。

#### 登录

`POST /api/passport/login`

无需登录。请求体为 `application/json`：

| 字段 | 类型 | 必填 | 说明 |
| ---- | ---- | ---- | ---- |
| `login` | string | 是 | 用户名或邮箱 |
| `password` | string | 是 | 密码 |

成功返回 `200`：

```json
{
  "token": "<JWT>",
  "user": {
    "id": 1,
    "username": "chenify",
    "email": "chenify@example.com",
    "avatar": "/uploads/xxxx.webp",
    "created_at": "2026-08-10 12:00:00"
  }
}
```

错误：`400` 必填项缺失，`401` 用户名或密码错误。

#### 当前用户

`GET /api/passport/me`

需要登录。返回当前登录用户的 `UserPublic`：

```json
{
  "id": 1,
  "username": "chenify",
  "email": "chenify@example.com",
  "avatar": "/uploads/xxxx.webp",
  "created_at": "2026-08-10 12:00:00"
}
```

错误：`401` 未提供有效登录凭证。

### 二、帖子（Posts）

#### 帖子列表

`GET /api/posts`

无需登录（可携带 Token 获得个性化字段）。查询参数：

| 参数 | 类型 | 说明 |
| ---- | ---- | ---- |
| `offset` | number | 分页偏移 |
| `limit` | number | 分页数量 |
| `tag` | string | 按标签过滤 |
| `sort` | `latest` \| `hot` | 排序方式，默认 `latest` |

返回 `200`，`Post[]` 数组。

#### 发布帖子

`POST /api/posts`

需要登录。请求体为 `multipart/form-data`：

| 字段 | 类型 | 必填 | 说明 |
| ---- | ---- | ---- | ---- |
| `content` | string | 是 | 帖子内容，≤ 20000 字 |
| `tags` | string | 否 | 标签，逗号/空格分隔 |
| `images` | File（可多个） | 否 | 图片，最多 9 张 |

成功返回 `201`，`Post`。

错误：`401` 未登录，`400` 参数不合法/上传超限。

#### 帖子详情

`GET /api/posts/:id`

无需登录（可携带 Token）。返回 `200`，`Post`（含完整图片、标签、作者信息）。

错误：`404` 帖子不存在。

#### 删除帖子

`DELETE /api/posts/:id`

需要登录，仅作者可删。成功返回 `200`：

```json
{ "success": true }
```

错误：`401` 未登录，`403` 无权删除，`404` 帖子不存在。

#### 点赞 / 取消点赞

`POST /api/posts/:id/like`（点赞）、`DELETE /api/posts/:id/like`（取消）

需要登录。成功返回 `200`：

```json
{ "liked": true, "likes_count": 12 }
```

错误：`401` 未登录，`404` 帖子不存在。

#### 收藏 / 取消收藏

`POST /api/posts/:id/favorite`、`DELETE /api/posts/:id/favorite`

需要登录。成功返回 `200`：

```json
{ "favorited": true, "favorites_count": 5 }
```

错误：`401` 未登录，`404` 帖子不存在。

#### 评论列表

`GET /api/posts/:id/comments`

无需登录。查询参数：`offset`、`limit`。分页仅作用于顶层评论（`parent_id` 为空），回复归入所属顶层评论的 `replies` 数组（平铺，按时间正序）。已登录时返回 `is_liked`、`likes_count`。返回 `200`，`Comment[]`。

错误：`404` 帖子不存在。

#### 发布评论

`POST /api/posts/:id/comments`

需要登录。请求体为 `application/json`：

| 字段 | 类型 | 必填 | 说明 |
| ---- | ---- | ---- | ---- |
| `content` | string | 是 | 评论内容，≤ 5000 字 |
| `parent_id` | number | 否 | 回复的目标评论 ID（须属于同一帖子） |

成功返回 `201`，`Comment`（顶层评论的 `replies` 为 `[]`）。

错误：`401` 未登录，`400` 内容为空/超长，`404` 帖子不存在或回复目标不存在。

#### 点赞评论 / 取消点赞

`POST /api/comments/:id/like`、`DELETE /api/comments/:id/like`

需要登录。`POST` 为点赞（已赞则切换取消），`DELETE` 为取消点赞。成功返回 `200`：

```json
{ "liked": true, "likes_count": 1 }
```

错误：`401` 未登录，`404` 评论不存在。

#### 删除评论

`DELETE /api/comments/:id`

需要登录，仅评论者本人可删。会级联删除该评论的所有回复及其点赞。成功返回 `200`：

```json
{ "success": true }
```

错误：`401` 未登录，`403` 无权删除，`404` 评论不存在。

### 三、关注 / 标签 / 隐私

#### 关注 / 取消关注

`POST /api/users/:id/follow`、`DELETE /api/users/:id/follow`

需要登录。成功返回 `200`：

```json
{ "following": true, "followers_count": 12 }
```

错误：`401` 未登录，`400` 不能关注自己，`404` 用户不存在。

#### 标签列表

`GET /api/tags`

无需登录。返回 `200`，`string[]`。

#### 修改隐私设置

`PATCH /api/user/privacy`

需要登录。请求体为 `application/json`（至少提供一个字段）：

| 字段 | 类型 | 说明 |
| ---- | ---- | ---- |
| `is_favorites_public` | boolean | 收藏是否公开 |
| `is_follows_public` | boolean | 关注/粉丝是否公开 |

成功返回 `200`：

```json
{ "success": true }
```

错误：`401` 未登录，`400` 未提供任何设置项。

### 四、草稿（Drafts）

#### 草稿列表

`GET /api/drafts`

需要登录（仅本人）。查询参数：

| 参数 | 类型 | 说明 |
| ---- | ---- | ---- |
| `offset` | number | 分页偏移 |
| `limit` | number | 分页数量 |
| `status` | `draft` \| `published` | 按状态过滤 |

返回 `200`，`Draft[]`。

错误：`401` 未登录。

#### 创建草稿

`POST /api/drafts`

需要登录。请求体为 `multipart/form-data`（字段与发帖相同：`content`、`tags`、`images`）。成功返回 `201`，`Draft`。

错误：`401` 未登录，`400` 参数不合法/上传超限。

#### 草稿详情

`GET /api/drafts/:id`

需要登录，仅本人可看。返回 `200`，`Draft`。

错误：`401` 未登录，`403` 无权查看，`404` 草稿不存在。

#### 更新草稿

`PATCH /api/drafts/:id`

需要登录，仅本人可改。请求体为 `multipart/form-data`（`content`、`tags`、`images`，图片整体替换）。

不能编辑已发布的草稿（需先取消发布）。成功返回 `200`，`Draft`。

错误：`401` 未登录，`400` 已发布草稿，`403` 无权修改，`404` 草稿不存在。

#### 删除草稿

`DELETE /api/drafts/:id`

需要登录，仅本人可删。成功返回 `200`：

```json
{ "success": true }
```

错误：`401` 未登录，`403` 无权删除，`404` 草稿不存在。

#### 发布草稿

`POST /api/drafts/:id/publish`

需要登录，仅本人可发布。发布成功后草稿不可再编辑。成功返回 `201`，对应的已生成 `Post`。

错误：`401` 未登录，`400` 内容为空/已发布，`403` 无权发布，`404` 草稿不存在。

#### 取消发布草稿

`POST /api/drafts/:id/unpublish`

需要登录，仅本人可操作。成功返回 `200`，更新后的 `Draft`（状态回到 `draft`）。

错误：`401` 未登录，`400` 尚未发布，`403` 无权操作，`404` 草稿不存在。

### 五、个人空间（Space）

#### 空间概览

`GET /api/users/:id/space`

无需登录（可携带 Token）。返回 `200`：

```json
{
  "user": {
    "id": 1,
    "username": "chenify",
    "email": "chenify@example.com",
    "avatar": "/uploads/xxxx.webp",
    "created_at": "2026-08-10 12:00:00",
    "is_favorites_public": true,
    "is_follows_public": true
  },
  "counts": {
    "posts": 3,
    "favorites": 12,
    "following": 5,
    "followers": 9
  },
  "relation": {
    "is_following": true,
    "is_followed_by": false
  }
}
```

- `counts.favorites` 仅本人或公开时返回数值，否则为 `null`
- `counts.following` / `counts.followers` 仅本人或公开时返回数值，否则为 `null`
- `relation`：未登录时为 `null`

错误：`404` 用户不存在。

#### 用户帖子

`GET /api/users/:id/space/posts`

无需登录（可携带 Token）。查询参数：`offset`、`limit`。返回 `200`，`Post[]`。

错误：`404` 用户不存在。

#### 用户收藏

`GET /api/users/:id/space/favorites`

无需登录（可携带 Token）。查询参数：`offset`、`limit`。返回 `200`：

```json
{
  "posts": [],
  "hidden": true,
  "offset": 0,
  "limit": 20
}
```

- 非本人且收藏不公开时 `hidden` 为 `true` 且 `posts` 为空

错误：`404` 用户不存在。

#### 用户关注列表

`GET /api/users/:id/space/following`

无需登录（可携带 Token）。查询参数：`offset`、`limit`。返回 `200`：

```json
{
  "users": [],
  "hidden": true,
  "offset": 0,
  "limit": 20
}
```

- 非本人且关注不公开时 `hidden` 为 `true` 且 `users` 为空
- `users` 元素为 `FollowUser`（含 `is_following`）

错误：`404` 用户不存在。

#### 用户粉丝列表

`GET /api/users/:id/space/followers`

无需登录（可携带 Token）。查询参数：`offset`、`limit`。返回结构与关注列表相同。

错误：`404` 用户不存在。

### 六、作品（Works）

#### 作品列表

`GET /api/works`

无需登录（可携带 Token）。查询参数：

| 参数 | 类型 | 说明 |
| ---- | ---- | ---- |
| `offset` | number | 分页偏移 |
| `limit` | number | 分页数量 |
| `sort` | `latest` \| `hot` | 排序方式，默认 `latest` |
| `author_id` | number | 按作者过滤 |

返回 `200`，`WorkSummary[]`。

错误：`404` 指定作者不存在。

#### 创建作品

`POST /api/works`

需要登录。请求体为 `multipart/form-data`：

| 字段 | 类型 | 必填 | 说明 |
| ---- | ---- | ---- | ---- |
| `title` | string | 是 | 作品标题，≤ 100 字符 |
| `cover` | File | 是 | 作品封面（3:2），必填 |
| `description` | string | 否 | 作品简介，≤ 5000 字 |
| `files` | File（可多个） | 否 | 作品文件，≤ 20 个，单个 ≤ 1MB |

成功返回 `201`，`WorkDetail`。

错误：`401` 未登录，`400` 标题为空/超限、封面缺失或不合法/文件超限。

#### 作品详情

`GET /api/works/:id`

无需登录（可携带 Token）。返回 `200`，`WorkDetail`（含文件列表）。

错误：`404` 作品不存在。

#### 更新作品

`PATCH /api/works/:id`

需要登录，仅作者可改。请求体为 `multipart/form-data`（字段与创建相同，`files` 整体替换，`cover` 可选——未提供封面时保留旧封面）。成功返回 `200`，`WorkDetail`。

错误：`401` 未登录，`403` 无权修改，`404` 作品不存在。

#### 删除作品

`DELETE /api/works/:id`

需要登录，仅作者可删。成功返回 `200`：

```json
{ "success": true }
```

错误：`401` 未登录，`403` 无权删除，`404` 作品不存在。

#### 派生作品（Fork）

`POST /api/works/:id/fork`

需要登录。复制源作品的文件与封面，创建自己的新作品；请求体可携带可选的 `cover` 文件以更换封面（未提供时复制源封面）。成功返回 `201`，`WorkDetail`（`parent_id` 指向源作品）。

错误：`401` 未登录，`404` 源作品不存在。

#### 派生列表

`GET /api/works/:id/forks`

无需登录（可携带 Token）。查询参数：`offset`、`limit`。返回 `200`，`WorkSummary[]`。

错误：`404` 作品不存在。

#### 点赞 / 取消点赞

`POST /api/works/:id/like`、`DELETE /api/works/:id/like`

需要登录。成功返回 `200`：

```json
{ "liked": true, "likes_count": 12 }
```

错误：`401` 未登录，`404` 作品不存在。

#### 收藏 / 取消收藏

`POST /api/works/:id/favorite`、`DELETE /api/works/:id/favorite`

需要登录。成功返回 `200`：

```json
{ "favorited": true, "favorites_count": 5 }
```

错误：`401` 未登录，`404` 作品不存在。

#### 评论列表

`GET /api/works/:id/comments`

无需登录。查询参数：`offset`、`limit`。分页仅作用于顶层评论（`parent_id` 为空），回复归入所属顶层评论的 `replies` 数组（平铺，按时间正序）。已登录时返回 `is_liked`、`likes_count`。返回 `200`，`WorkComment[]`。

错误：`404` 作品不存在。

#### 发布评论

`POST /api/works/:id/comments`

需要登录。请求体为 `application/json`：

| 字段 | 类型 | 必填 | 说明 |
| ---- | ---- | ---- | ---- |
| `content` | string | 是 | 评论内容，≤ 5000 字 |
| `parent_id` | number | 否 | 回复的目标评论 ID（须属于同一作品） |

成功返回 `201`，`WorkComment`（顶层评论的 `replies` 为 `[]`）。

错误：`401` 未登录，`400` 内容为空/超长，`404` 作品不存在或回复目标不存在。

#### 点赞评论 / 取消点赞

`POST /api/works/comments/:id/like`、`DELETE /api/works/comments/:id/like`

需要登录。`POST` 为点赞（已赞则切换取消），`DELETE` 为取消点赞。成功返回 `200`：

```json
{ "liked": true, "likes_count": 1 }
```

错误：`401` 未登录，`404` 评论不存在。

#### 删除评论

`DELETE /api/works/comments/:id`

需要登录，仅评论者本人可删。会级联删除该评论的所有回复及其点赞。成功返回 `200`：

```json
{ "success": true }
```

错误：`401` 未登录，`403` 无权删除，`404` 评论不存在。

### 七、静态资源

#### 上传文件访问

`GET /uploads/*`

无需登录。按文件路径返回二进制内容（头像、帖子图片、作品文件等）。

- 文件名必须为单一名称（不允许 `/`、`\`、`..`），否则返回 `404`
- 未知路径返回 `404`

## 数据模型

### UserPublic

| 字段 | 类型 | 说明 |
| ---- | ---- | ---- |
| `id` | number | 用户 ID |
| `username` | string | 用户名 |
| `email` | string | 邮箱 |
| `avatar` | string \| null | 头像地址 |
| `created_at` | string | 注册时间 |

### UserSummary

| 字段 | 类型 | 说明 |
| ---- | ---- | ---- |
| `id` | number | 用户 ID |
| `username` | string | 用户名 |
| `avatar` | string \| null | 头像地址 |
| `created_at` | string | 注册时间 |

### SpaceUser

继承 `UserPublic`，并追加：

| 字段 | 类型 | 说明 |
| ---- | ---- | ---- |
| `is_favorites_public` | boolean | 收藏是否公开 |
| `is_follows_public` | boolean | 关注/粉丝是否公开 |

### SpaceCounts

| 字段 | 类型 | 说明 |
| ---- | ---- | ---- |
| `posts` | number | 帖子数 |
| `favorites` | number \| null | 收藏数（隐藏时为 null） |
| `following` | number \| null | 关注数（隐藏时为 null） |
| `followers` | number \| null | 粉丝数（隐藏时为 null） |

### SpaceRelation

| 字段 | 类型 | 说明 |
| ---- | ---- | ---- |
| `is_following` | boolean | 我是否关注了该用户 |
| `is_followed_by` | boolean | 该用户是否关注了我 |

### FollowUser

继承 `UserSummary`，并追加：

| 字段 | 类型 | 说明 |
| ---- | ---- | ---- |
| `is_following` | boolean | 我是否关注了该用户 |

### Post

| 字段 | 类型 | 说明 |
| ---- | ---- | ---- |
| `id` | number | 帖子 ID |
| `content` | string | 内容 |
| `created_at` | string | 发布时间 |
| `author` | UserSummary | 作者信息 |
| `images` | string[] | 图片地址列表 |
| `tags` | string[] | 标签列表 |
| `comments_count` | number | 评论数 |
| `likes_count` | number | 点赞数 |
| `favorites_count` | number | 收藏数 |
| `is_liked` | boolean | 我是否已点赞 |
| `is_favorited` | boolean | 我是否已收藏 |
| `is_following_author` | boolean | 我是否关注了作者 |

### Comment

| 字段 | 类型 | 说明 |
| ---- | ---- | ---- |
| `id` | number | 评论 ID |
| `post_id` | number | 所属帖子 ID |
| `parent_id` | number \| null | 回复目标评论 ID（null 为顶层评论） |
| `content` | string | 评论内容 |
| `created_at` | string | 评论时间 |
| `author` | UserSummary | 评论者信息 |
| `likes_count` | number | 点赞数 |
| `is_liked` | boolean | 我是否已点赞 |
| `replies` | Comment[] | 回复列表（顶层评论包含其下全部后代，平铺） |
| `post_snippet` | string | 帖子内容摘要 |

### Draft

| 字段 | 类型 | 说明 |
| ---- | ---- | ---- |
| `id` | number | 草稿 ID |
| `content` | string | 内容 |
| `user_id` | number | 归属用户 ID |
| `status` | `draft` \| `published` | 状态 |
| `post_id` | number \| null | 发布后关联的帖子 ID |
| `created_at` | string | 创建时间 |
| `updated_at` | string | 更新时间 |
| `images` | string[] | 图片地址列表 |
| `tags` | string[] | 标签列表 |

### WorkFile

| 字段 | 类型 | 说明 |
| ---- | ---- | ---- |
| `id` | number | 文件 ID |
| `name` | string | 原始文件名 |
| `path` | string | 文件地址 |
| `size` | number | 文件大小（字节） |

### WorkSummary

| 字段 | 类型 | 说明 |
| ---- | ---- | ---- |
| `id` | number | 作品 ID |
| `title` | string | 标题 |
| `description` | string | 简介 |
| `cover` | string | 封面地址 |
| `parent_id` | number \| null | 派生来源作品 ID |
| `created_at` | string | 创建时间 |
| `updated_at` | string | 更新时间 |
| `author` | UserSummary | 作者信息 |
| `files_count` | number | 文件数 |
| `comments_count` | number | 评论数 |
| `likes_count` | number | 点赞数 |
| `favorites_count` | number | 收藏数 |
| `is_liked` | boolean | 我是否已点赞 |
| `is_favorited` | boolean | 我是否已收藏 |

### WorkDetail

继承 `WorkSummary`，并追加：

| 字段 | 类型 | 说明 |
| ---- | ---- | ---- |
| `files` | WorkFile[] | 作品文件列表 |

### WorkComment

| 字段 | 类型 | 说明 |
| ---- | ---- | ---- |
| `id` | number | 评论 ID |
| `work_id` | number | 所属作品 ID |
| `parent_id` | number \| null | 回复目标评论 ID（null 为顶层评论） |
| `content` | string | 评论内容 |
| `created_at` | string | 评论时间 |
| `author` | UserSummary | 评论者信息 |
| `likes_count` | number | 点赞数 |
| `is_liked` | boolean | 我是否已点赞 |
| `replies` | WorkComment[] | 回复列表（顶层评论包含其下全部后代，平铺） |

## 接口索引

| 方法 | 路径 | 认证 |
| ---- | ---- | ---- |
| POST | `/api/passport/register` | 否 |
| POST | `/api/passport/login` | 否 |
| GET | `/api/passport/me` | 是 |
| GET | `/api/posts` | 否 |
| POST | `/api/posts` | 是 |
| GET | `/api/posts/:id` | 否 |
| DELETE | `/api/posts/:id` | 是（作者） |
| POST | `/api/posts/:id/like` | 是 |
| DELETE | `/api/posts/:id/like` | 是 |
| POST | `/api/posts/:id/favorite` | 是 |
| DELETE | `/api/posts/:id/favorite` | 是 |
| GET | `/api/posts/:id/comments` | 否 |
| POST | `/api/posts/:id/comments` | 是 |
| DELETE | `/api/comments/:id` | 是（本人） |
| POST | `/api/comments/:id/like` | 是 |
| DELETE | `/api/comments/:id/like` | 是 |
| POST | `/api/users/:id/follow` | 是 |
| DELETE | `/api/users/:id/follow` | 是 |
| GET | `/api/tags` | 否 |
| PATCH | `/api/user/privacy` | 是 |
| GET | `/api/drafts` | 是 |
| POST | `/api/drafts` | 是 |
| GET | `/api/drafts/:id` | 是（本人） |
| PATCH | `/api/drafts/:id` | 是（本人） |
| DELETE | `/api/drafts/:id` | 是（本人） |
| POST | `/api/drafts/:id/publish` | 是（本人） |
| POST | `/api/drafts/:id/unpublish` | 是（本人） |
| GET | `/api/users/:id/space` | 否 |
| GET | `/api/users/:id/space/posts` | 否 |
| GET | `/api/users/:id/space/favorites` | 否 |
| GET | `/api/users/:id/space/following` | 否 |
| GET | `/api/users/:id/space/followers` | 否 |
| GET | `/api/works` | 否 |
| POST | `/api/works` | 是 |
| GET | `/api/works/:id` | 否 |
| PATCH | `/api/works/:id` | 是（作者） |
| DELETE | `/api/works/:id` | 是（作者） |
| POST | `/api/works/:id/fork` | 是 |
| GET | `/api/works/:id/forks` | 否 |
| POST | `/api/works/:id/like` | 是 |
| DELETE | `/api/works/:id/like` | 是 |
| POST | `/api/works/:id/favorite` | 是 |
| DELETE | `/api/works/:id/favorite` | 是 |
| GET | `/api/works/:id/comments` | 否 |
| POST | `/api/works/:id/comments` | 是 |
| DELETE | `/api/works/comments/:id` | 是（本人） |
| POST | `/api/works/comments/:id/like` | 是 |
| DELETE | `/api/works/comments/:id/like` | 是 |
| GET | `/uploads/*` | 否 |