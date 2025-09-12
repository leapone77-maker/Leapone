# 部署指南

本文档将指导您如何将积分系统部署到 Vercel 平台，并使用 MongoDB Atlas 作为数据库。

## 前提条件

1. [GitHub](https://github.com/) 账号
2. [Vercel](https://vercel.com/) 账号
3. [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) 账号

## 步骤 1: 准备 MongoDB Atlas 数据库

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
4. 在「Environment Variables」部分添加以下环境变量：
   - `MONGODB_URI`: 你的 MongoDB 连接字符串
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

## 注意事项

1. 本项目使用 Vercel 的无服务器函数架构，API 路由位于 `/api` 目录下
2. 图片上传功能在当前版本中已被移除，如需恢复，建议集成云存储服务如 AWS S3 或 Cloudinary
3. 确保 MongoDB Atlas 的连接字符串正确设置在 Vercel 的环境变量中
4. 如需本地开发，可以使用 `npm run dev` 命令启动开发服务器

## 故障排除

如果遇到部署问题：

1. 检查 Vercel 部署日志中的错误信息
2. 确认环境变量是否正确设置
3. 验证 MongoDB Atlas 连接是否正常工作
4. 检查网络访问权限是否正确配置

## 本地开发

1. 克隆仓库到本地
2. 安装依赖：`npm install`
3. 创建 `.env` 文件并添加 `MONGODB_URI=你的MongoDB连接字符串`
4. 启动开发服务器：`npm run dev`
5. 访问 `http://localhost:3000` 查看应用