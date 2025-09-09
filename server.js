const express = require('express');
const multer = require('multer');
const path = require('path');
const cors = require('cors');
const fs = require('fs');

const app = express();
const PORT = 8080;

// 中间件
app.use(cors());
app.use(express.json());
app.use(express.static('public'));
app.use('/uploads', express.static('uploads'));

// 确保上传目录存在
if (!fs.existsSync('uploads')) {
  fs.mkdirSync('uploads');
}

// 确保数据目录存在
if (!fs.existsSync('data')) {
  fs.mkdirSync('data');
}

// 配置multer用于文件上传
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});
const upload = multer({ storage });

// 数据文件路径
const DATA_FILE = path.join(__dirname, 'data', 'points.json');

// 初始化数据
function initData() {
  if (!fs.existsSync(DATA_FILE)) {
    const initialData = {
      pointsHistory: [],
      redemptions: []
    };
    fs.writeFileSync(DATA_FILE, JSON.stringify(initialData, null, 2));
  }
}

// 读取数据
function readData() {
  initData();
  const data = fs.readFileSync(DATA_FILE, 'utf8');
  return JSON.parse(data);
}

// 写入数据
function writeData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

// 路由

// 获取积分历史
app.get('/api/history', (req, res) => {
  const data = readData();
  
  const history = [
    ...data.pointsHistory.map(item => ({
      ...item,
      type: item.type
    })),
    ...data.redemptions.map(item => ({
      id: item.id,
      type: 'redemption',
      description: item.gift_name,
      points_change: -item.points_cost,
      image_url: null,
      created_at: item.created_at
    }))
  ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  
  res.json(history);
});

// 添加积分记录（带图片上传）
app.post('/api/points', upload.single('image'), (req, res) => {
  const { type, description, points_change } = req.body;
  const image_url = req.file ? `/uploads/${req.file.filename}` : null;

  const data = readData();
  
  const newRecord = {
    id: Date.now(),
    type,
    description,
    points_change: parseInt(points_change),
    image_url,
    created_at: new Date().toISOString()
  };
  
  data.pointsHistory.push(newRecord);
  writeData(data);
  
  res.json(newRecord);
});

// 积分兑换
app.post('/api/redemptions', (req, res) => {
  const { gift_name, points_cost } = req.body;
  
  const data = readData();
  
  // 计算当前总积分
  const totalPoints = calculateTotalPoints(data);
  
  if (totalPoints < points_cost) {
    res.status(400).json({ error: '积分不足' });
    return;
  }
  
  const newRedemption = {
    id: Date.now(),
    gift_name,
    points_cost: parseInt(points_cost),
    created_at: new Date().toISOString()
  };
  
  data.redemptions.push(newRedemption);
  writeData(data);
  
  res.json(newRedemption);
});

// 获取当前总积分
app.get('/api/total-points', (req, res) => {
  const data = readData();
  const totalPoints = calculateTotalPoints(data);
  res.json({ total_points: totalPoints });
});

// 计算总积分
function calculateTotalPoints(data) {
  const pointsFromHistory = data.pointsHistory.reduce((sum, item) => sum + item.points_change, 0);
  const pointsFromRedemptions = data.redemptions.reduce((sum, item) => sum - item.points_cost, 0);
  return pointsFromHistory + pointsFromRedemptions;
}

// 提供前端页面
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 初始化数据
initData();

app.listen(PORT, () => {
  console.log(`服务器运行在 http://localhost:${PORT}`);
});