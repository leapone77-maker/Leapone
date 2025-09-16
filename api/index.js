const express = require('express');
const path = require('path');
const cors = require('cors');
const multer = require('multer');
const { MongoClient, ObjectId } = require('mongodb');

const app = express();

// 配置multer用于文件上传
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, '..', 'uploads'));
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({ storage: storage });

// 确保uploads目录存在
const fs = require('fs');
const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}

// MongoDB 连接字符串
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://leapone77_db_user:ksEdIpn2X6w13Qzv@points-system.slhahhe.mongodb.net/?retryWrites=true&w=majority&appName=points-system';
const DB_NAME = 'points_system';

// MongoDB 客户端
let client;
let db;

// 初始化 MongoDB 连接
async function connectToDatabase() {
  if (db) return db;
  
  try {
    client = await MongoClient.connect(MONGODB_URI);
    db = client.db(DB_NAME);
    console.log('已连接到 MongoDB');
    return db;
  } catch (error) {
    console.error('MongoDB 连接错误:', error);
    throw error;
  }
}

// 中间件
app.use(cors());
app.use(express.json());
app.use(express.static('public'));
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// 初始化数据库集合
async function initDatabase() {
  try {
    const db = await connectToDatabase();
    
    // 确保集合存在
    await db.createCollection('points_history').catch(() => {});
    await db.createCollection('redemptions').catch(() => {});
    
    console.log('数据库集合已初始化');
  } catch (error) {
    console.error('初始化数据库错误:', error);
    console.log('将使用模拟数据继续运行');
  }
}

// 模拟数据
const mockHistory = [
  {
    _id: 'mock1',
    type: 'default',
    description: '完成作业',
    points_change: 10,
    image_url: null,
    created_at: new Date(Date.now() - 3600000).toISOString()
  },
  {
    _id: 'mock2',
    type: 'redemption',
    description: '小玩具',
    points_change: -5,
    image_url: null,
    created_at: new Date(Date.now() - 7200000).toISOString()
  },
  {
    _id: 'mock3',
    type: 'default',
    description: '帮助做家务',
    points_change: 8,
    image_url: null,
    created_at: new Date(Date.now() - 10800000).toISOString()
  }
];

let mockTotalPoints = 13;

// 路由

// 获取积分历史
app.get('/api/history', async (req, res) => {
  try {
    const db = await connectToDatabase().catch(() => null);
    
    if (db) {
      // 获取积分记录
      const pointsHistory = await db.collection('points_history')
        .find({})
        .sort({ created_at: -1 })
        .toArray();
      
      // 获取兑换记录
      const redemptions = await db.collection('redemptions')
        .find({})
        .sort({ created_at: -1 })
        .toArray();
      
      // 合并记录
      const history = [
        ...pointsHistory,
        ...redemptions.map(item => ({
          _id: item._id,
          type: 'redemption',
          description: item.gift_name,
          points_change: -item.points_cost,
          image_url: null,
          created_at: item.created_at
        }))
      ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      
      res.json(history);
    } else {
      // 使用模拟数据
      res.json(mockHistory);
    }
  } catch (error) {
    console.error('获取历史记录错误:', error);
    // 出错时也返回模拟数据
    res.json(mockHistory);
  }
});

// 添加积分记录（支持图片上传）
app.post('/api/points', upload.single('image'), async (req, res) => {
  try {
    const { description, points_change } = req.body;
    const type = req.body.type || 'default';
    
    // 处理图片
    let imageUrl = null;
    if (req.file) {
      imageUrl = '/uploads/' + req.file.filename;
    }
    
    const newRecord = {
      type,
      description,
      points_change: parseInt(points_change),
      image_url: imageUrl,
      created_at: new Date().toISOString()
    };
    
    const db = await connectToDatabase().catch(() => null);
    
    if (db) {
      const result = await db.collection('points_history').insertOne(newRecord);
      
      res.json({
        _id: result.insertedId,
        ...newRecord
      });
    } else {
      // 模拟添加记录
      const mockId = 'mock' + Date.now();
      const mockRecord = {
        _id: mockId,
        ...newRecord
      };
      
      mockHistory.unshift(mockRecord);
      mockTotalPoints += parseInt(points_change);
      
      res.json(mockRecord);
    }
  } catch (error) {
    console.error('添加积分记录错误:', error);
    
    // 出错时也模拟添加记录
    const { description, points_change } = req.body || {};
    const type = req.body.type || 'default';
    
    const mockId = 'mock' + Date.now();
    const mockRecord = {
      _id: mockId,
      type,
      description: description || '模拟记录',
      points_change: parseInt(points_change) || 5,
      image_url: null,
      created_at: new Date().toISOString()
    };
    
    mockHistory.unshift(mockRecord);
    mockTotalPoints += parseInt(points_change) || 5;
    
    res.json(mockRecord);
  }
});

// 积分兑换
app.post('/api/redemptions', async (req, res) => {
  try {
    const { gift_name, points_cost } = req.body;
    
    // 尝试获取数据库连接
    const db = await connectToDatabase().catch(() => null);
    let totalPoints = mockTotalPoints;
    
    if (db) {
      // 计算当前总积分
      totalPoints = await calculateTotalPoints();
      
      if (totalPoints < points_cost) {
        res.status(400).json({ error: '积分不足' });
        return;
      }
      
      const newRedemption = {
        gift_name,
        points_cost: parseInt(points_cost),
        created_at: new Date().toISOString()
      };
      
      const result = await db.collection('redemptions').insertOne(newRedemption);
      
      res.json({
        _id: result.insertedId,
        ...newRedemption
      });
    } else {
      // 模拟积分兑换
      if (mockTotalPoints < points_cost) {
        res.status(400).json({ error: '积分不足' });
        return;
      }
      
      const mockId = 'mock' + Date.now();
      const mockRedemption = {
        _id: mockId,
        type: 'redemption',
        description: gift_name,
        points_change: -parseInt(points_cost),
        image_url: null,
        created_at: new Date().toISOString()
      };
      
      mockHistory.unshift(mockRedemption);
      mockTotalPoints -= parseInt(points_cost);
      
      res.json({
        _id: mockId,
        gift_name,
        points_cost: parseInt(points_cost),
        created_at: new Date().toISOString()
      });
    }
  } catch (error) {
    console.error('积分兑换错误:', error);
    
    // 出错时也模拟积分兑换
    const { gift_name, points_cost } = req.body || {};
    
    if (mockTotalPoints < (parseInt(points_cost) || 0)) {
      res.status(400).json({ error: '积分不足' });
      return;
    }
    
    const mockId = 'mock' + Date.now();
    const mockRedemption = {
      _id: mockId,
      type: 'redemption',
      description: gift_name || '模拟兑换',
      points_change: -(parseInt(points_cost) || 5),
      image_url: null,
      created_at: new Date().toISOString()
    };
    
    mockHistory.unshift(mockRedemption);
    mockTotalPoints -= parseInt(points_cost) || 5;
    
    res.json({
      _id: mockId,
      gift_name: gift_name || '模拟兑换',
      points_cost: parseInt(points_cost) || 5,
      created_at: new Date().toISOString()
    });
  }
});

// 获取当前总积分
app.get('/api/total-points', async (req, res) => {
  try {
    const db = await connectToDatabase().catch(() => null);
    
    if (db) {
      const totalPoints = await calculateTotalPoints();
      res.json({ total_points: totalPoints });
    } else {
      // 使用模拟数据
      res.json({ total_points: mockTotalPoints });
    }
  } catch (error) {
    console.error('获取总积分错误:', error);
    // 出错时也返回模拟数据
    res.json({ total_points: mockTotalPoints });
  }
});

// 计算总积分
async function calculateTotalPoints() {
  try {
    const db = await connectToDatabase();
    
    // 获取积分记录总和
    const pointsHistoryResult = await db.collection('points_history').aggregate([
      {
        $group: {
          _id: null,
          total: { $sum: '$points_change' }
        }
      }
    ]).toArray();
    
    const pointsFromHistory = pointsHistoryResult.length > 0 ? pointsHistoryResult[0].total : 0;
    
    // 获取兑换记录总和
    const redemptionsResult = await db.collection('redemptions').aggregate([
      {
        $group: {
          _id: null,
          total: { $sum: '$points_cost' }
        }
      }
    ]).toArray();
    
    const pointsFromRedemptions = redemptionsResult.length > 0 ? redemptionsResult[0].total : 0;
    
    return pointsFromHistory - pointsFromRedemptions;
  } catch (error) {
    console.error('计算总积分错误:', error);
    throw error;
  }
}

// 提供前端页面
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

// 初始化数据库（异步方式，即使失败也继续运行）
initDatabase().catch(err => {
  console.error('数据库初始化失败，但服务器将继续运行:', err);
});

// 启动服务器（无论是开发环境还是生产环境）
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`服务器运行在 http://localhost:${PORT}`);
  console.log('即使数据库连接失败，也可以使用模拟数据查看和使用基本功能');
});

// 导出 Express 应用实例以在 Vercel 上运行
module.exports = app;