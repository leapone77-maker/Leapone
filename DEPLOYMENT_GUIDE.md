# 儿童积分记录系统 - 部署指南

本指南详细介绍如何将儿童积分记录系统免费部署到第三方服务器，让所有人可以通过Web地址直接访问，无需登录。

## 项目特性

- 无需登录，直接访问即可使用所有功能
- 支持图片上传功能，可以上传相关图片记录
- 包含数据库连接失败时的模拟数据功能，确保即使数据库不可用也能正常展示

## 免费部署选项

### 选项1: Vercel 部署 (推荐)

Vercel是一个优秀的免费部署平台，特别适合这个项目，因为我们已经配置了`vercel.json`文件。

**前提条件:**

1. [GitHub](https://github.com/) 账号
2. [Vercel](https://vercel.com/) 账号 (可选) [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) 账号

## 步骤 1: 准备 MongoDB Atlas 数据库 (可选)

> **注意:** 本项目包含数据库连接失败时的模拟数据功能，即使不配置MongoDB，系统也能正常运行。

1. 登录 [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. 创建一个新的集群（可以选择免费层）
3. 在「Database Access」中创建一个新用户，并赋予读写权限
4. 在「Network Access」中添加 `0.0.0.0/0` 以允许从任何地方访问（或者限制为特定 IP）
5. 获取数据库连接字符串，格式类似：`mongodb+srv://<username>:<password>@<cluster-url>/<dbname>?retryWrites=true&w=majority`

## 步骤 2: 将代码推送到 GitHub

1. 在 GitHub 上创建一个新的仓库
2. 将本地代码推送到该仓库：

```bash
git init
git add .
git commit -m "初始提交"
git branch -M main
git remote add origin https://github.com/你的用户名/你的仓库名.git
git push -u origin main
```

## 步骤 3: 在 Vercel 上部署

1. 登录 [Vercel](https://vercel.com/)
2. 点击「New Project」
3. 导入你刚刚创建的 GitHub 仓库
4. 在「Environment Variables」部分添加以下环境变量（可选）：
   - `MONGODB_URI`: 你的 MongoDB 连接字符串
   - `PORT`: 服务器端口（可选，默认为3000）
   - `DB_NAME`: 数据库名称（可选，默认为"points_system"）
5. 点击「Deploy」开始部署

部署完成后，Vercel 会提供一个域名（例如 `your-app.vercel.app`），你可以通过这个域名访问你的应用。

## 项目结构说明

```
/
├── api/                # 后端 API 代码（Vercel 无服务器函数）
│   └── index.js        # 主要 API 入口点
├── public/             # 前端静态文件
│   ├── index.html      # 主页面
│   ├── style.css       # 样式表
│   └── script.js       # 前端 JavaScript
├── package.json        # 项目依赖和脚本
└── vercel.json         # Vercel 配置文件
```

## 技术栈

- **前端**: HTML, CSS, JavaScript
- **后端**: Node.js, Express.js
- **数据库**: MongoDB Atlas
- **部署**: Vercel

### 选项2: Render 部署

Render是另一个提供免费Node.js应用托管的平台。

**部署步骤：**

1. **准备GitHub/GitLab账户**
   - 将项目代码上传到你的GitHub或GitLab仓库

2. **注册Render账户**
   - 访问 [Render官网](https://render.com/) 注册免费账户

3. **创建Web服务**
   - 在Render控制台点击 "New" -> "Web Service"
   - 选择你的项目仓库进行导入
   - 配置部署设置：
     - **Build Command**: `npm install`
     - **Start Command**: `npm start`
     - **Environment**: Node.js
     - **Region**: 选择离你最近的区域

4. **配置环境变量**
   - 在环境变量部分添加与Vercel相同的环境变量（可选）

5. **部署项目**
   - 点击 "Create Web Service" 开始部署
   - 部署完成后，Render会提供一个域名供你访问项目

### 选项3: Railway 部署

Railway提供免费的Node.js应用部署服务，并且包含MongoDB数据库选项。

**部署步骤：**

1. **准备GitHub账户**
   - 将项目代码上传到你的GitHub仓库

2. **注册Railway账户**
   - 访问 [Railway官网](https://railway.app/) 注册免费账户

3. **创建新项目**
   - 在Railway控制台点击 "New Project" -> "Deploy from GitHub repo"
   - 选择你的项目仓库

4. **配置环境变量**
   - 添加可选的环境变量
   - 你也可以在Railway上创建一个免费的MongoDB数据库并连接

5. **部署项目**
   - Railway会自动开始部署过程
   - 部署完成后，你可以访问提供的域名

## 无需登录配置说明

本项目已配置为无需登录即可使用所有功能。以下是实现细节：

1. 所有API端点均无需身份验证
2. 前端页面直接加载所有功能
3. 数据存储在浏览器本地存储中（如果数据库连接不可用）

## 数据库连接与模拟数据

项目包含智能的数据库连接处理逻辑：

1. **优先使用真实数据库**：如果配置了`MONGODB_URI`环境变量，系统会尝试连接到MongoDB数据库
2. **数据库连接失败时**：系统会自动切换到使用内置的模拟数据功能，确保用户仍然可以正常使用所有功能
3. **模拟数据内容**：包含一些示例积分记录和积分兑换记录

## 自定义域名（可选）

大多数平台都支持绑定自定义域名：

1. **Vercel**：在项目设置的 "Domains" 部分添加自定义域名
2. **Render**：在服务设置的 "Custom Domains" 部分添加自定义域名
3. **Railway**：在项目设置的 "Domains" 部分添加自定义域名

## 监控与维护

1. **查看日志**：所有平台都提供日志查看功能，可以帮助排查问题
2. **更新代码**：大多数平台会在你推送代码到仓库时自动重新部署
3. **环境变量管理**：可以随时更新环境变量而无需重新部署整个项目

## 注意事项

1. 本项目使用 Vercel 的无服务器函数架构，API 路由位于 `/api` 目录下
2. 项目支持图片上传功能，上传的图片将存储在部署平台提供的临时存储中
3. 确保 MongoDB Atlas 的连接字符串正确设置在环境变量中（如果使用真实数据库）
4. 如需本地开发，可以使用 `npm run dev` 命令启动开发服务器

## 故障排除

如果遇到部署问题：

1. 检查部署平台日志中的错误信息
2. 确认环境变量是否正确设置
3. 验证 MongoDB Atlas 连接是否正常工作（如果使用真实数据库）
4. 检查网络访问权限是否正确配置

如果数据库连接失败，系统会自动切换到模拟数据模式，确保用户仍然可以正常使用所有功能。