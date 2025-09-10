# 儿童积分系统部署指南

## 免费部署方案

### 1. Vercel (推荐免费方案)
Vercel提供永久免费套餐，适合个人项目。

**详细部署步骤：**

1. **注册账号**
   - 访问 https://vercel.com
   - 使用GitHub账号登录

2. **导入项目**
   - 点击 "New Project"
   - 选择您的GitHub仓库
   - **框架预设选择 "Other"**（这是正确的选择）
   - Vercel会自动检测vercel.json配置

3. **配置环境变量**
   - 在项目控制台 → Settings → Environment Variables
   - 添加：
     - `SUPABASE_URL` = `https://zfbyenwpxslybpfyrrax.supabase.co`
     - `SUPABASE_KEY` = 您的Supabase密钥

4. **部署**
   - 点击 "Deploy"
   - 等待部署完成
   - 获得免费的vercel.app域名

**免费限制：**
- 100GB带宽/月
- 无限项目
- 自动SSL证书

### 2. Netlify Functions
Netlify也提供免费套餐，通过Functions支持Node.js。

### 3. GitHub Pages + Supabase
前端部署到GitHub Pages，后端API使用Supabase免费层。

### 4. Render (有休眠限制)
免费套餐但应用不活跃时会休眠，唤醒需要时间。

### 1. 准备部署
项目已配置好Railway部署文件：
- `railway.toml` - Railway配置文件
- `.env.example` - 环境变量模板

### 2. 部署到 Railway

1. **注册 Railway 账号**
   - 访问 https://railway.app
   - 使用GitHub账号登录

2. **创建新项目**
   - 点击 "New Project"
   - 选择 "Deploy from GitHub repo"
   - 选择您的代码仓库

3. **配置环境变量**
   - 在Railway控制台 → Settings → Variables
   - 添加以下环境变量：
     ```
     SUPABASE_URL=https://zfbyenwpxslybpfyrrax.supabase.co
     SUPABASE_KEY=您的Supabase密钥
     PORT=8080
     ```

4. **自动部署**
   - Railway会自动检测到项目并开始部署
   - 部署完成后会提供访问URL

### 3. 替代部署方案

#### Vercel (适合前端 + API路由)
```bash
npm i -g vercel
vercel --prod
```

#### Heroku
```bash
# 安装Heroku CLI
heroku create your-app-name
git push heroku main
```

#### 腾讯云云开发
- 访问 https://console.cloud.tencent.com/tcb
- 创建云开发环境
- 上传代码包部署

### 4. 本地测试
```bash
npm install
npm run dev
```

## 故障排除

如果部署失败，检查：
1. 环境变量是否正确配置
2. 端口是否被占用（Railway会自动分配端口）
3. Supabase连接是否正常

## 项目结构
- `server.js` - Express服务器
- `public/` - 前端静态文件
- `uploads/` - 上传文件目录
- `data/` - 数据文件目录