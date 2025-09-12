const express = require('express');
const multer = require('multer');
const path = require('path');
const cors = require('cors');
const { MongoClient, ObjectId } = require('mongodb');

const app = express();

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

// 配置multer使用内存存储
const upload = multer({ storage: multer.memoryStorage() });

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
  }
}

// 路由

// 获取积分历史
app.get('/api/history', async (req, res) => {
  try {
    const db = await connectToDatabase();
    
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
  } catch (error) {
    console.error('获取历史记录错误:', error);
    res.status(500).json({ error: '获取历史记录失败' });
  }
});

// 添加积分记录（带图片上传）
app.post('/api/points', upload.single('image'), async (req, res) => {
  try {
    const { description, points_change } = req.body;
    const type = req.body.type || 'default';
    
    // 注意：在无服务器环境中，我们无法保存上传的图片到本地文件系统
    // 在完整实现中，应该使用云存储服务如 AWS S3, Cloudinary 等
    // 这里我们暂时忽略图片上传功能
    
    const newRecord = {
      type,
      description,
      points_change: parseInt(points_change),
      image_url: null,
      created_at: new Date().toISOString()
    };
    
    const db = await connectToDatabase();
    const result = await db.collection('points_history').insertOne(newRecord);
    
    res.json({
      _id: result.insertedId,
      ...newRecord
    });
  } catch (error) {
    console.error('添加积分记录错误:', error);
    res.status(500).json({ error: '添加积分记录失败' });
  }
});

// 积分兑换
app.post('/api/redemptions', async (req, res) => {
  try {
    const { gift_name, points_cost } = req.body;
    
    // 计算当前总积分
    const totalPoints = await calculateTotalPoints();
    
    if (totalPoints < points_cost) {
      res.status(400).json({ error: '积分不足' });
      return;
    }
    
    const newRedemption = {
      gift_name,
      points_cost: parseInt(points_cost),
      created_at: new Date().toISOString()
    };
    
    const db = await connectToDatabase();
    const result = await db.collection('redemptions').insertOne(newRedemption);
    
    res.json({
      _id: result.insertedId,
      ...newRedemption
    });
  } catch (error) {
    console.error('积分兑换错误:', error);
    res.status(500).json({ error: '积分兑换失败' });
  }
});

// 获取当前总积分
app.get('/api/total-points', async (req, res) => {
  try {
    const totalPoints = await calculateTotalPoints();
    res.json({ total_points: totalPoints });
  } catch (error) {
    console.error('获取总积分错误:', error);
    res.status(500).json({ error: '获取总积分失败' });
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

// 初始化数据库
initDatabase();

// 本地开发环境下启动服务器
if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`服务器运行在 http://localhost:${PORT}`);
  });
}

// 导出 Express 应用实例以在 Vercel 上运行
module.exports = app;