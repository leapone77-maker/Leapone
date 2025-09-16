const express = require('express');
const path = require('path');
const cors = require('cors');
const multer = require('multer');
const { MongoClient, ObjectId } = require('mongodb');
const fs = require('fs');

// express已经在其他地方导入，这里不再重复导入
// const express = require('express');
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
const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}

// 数据文件路径
const dataFilePath = path.join(__dirname, '..', 'data', 'points.json');

// 读取数据函数
function readData() {
  try {
    if (!fs.existsSync(dataFilePath)) {
      // 如果文件不存在，创建一个新的空文件
      fs.writeFileSync(dataFilePath, JSON.stringify({
        rewards: [],
        pointsHistory: [],
        redemptions: [],
        totalPoints: 13
      }, null, 2));
      return {
        mockHistory: [],
        mockTotalPoints: 13
      };
    }
    
    const data = fs.readFileSync(dataFilePath, 'utf8');
    const parsedData = JSON.parse(data);
    
    // 兼容现有文件格式
    // 从pointsHistory和redemptions合并生成mockHistory
    let mockHistory = [];
    
    // 处理积分记录
    if (Array.isArray(parsedData.pointsHistory)) {
      mockHistory = mockHistory.concat(parsedData.pointsHistory.map(item => ({
        _id: item._id || 'mock' + Date.now(),
        type: 'default',
        description: item.description,
        points_change: item.points_change,
        image_url: item.image_url || null,
        created_at: item.created_at || new Date().toISOString()
      })));
    }
    
    // 处理兑换记录
    if (Array.isArray(parsedData.redemptions)) {
      mockHistory = mockHistory.concat(parsedData.redemptions.map(item => ({
        _id: item._id || 'mock' + Date.now(),
        type: 'redemption',
        description: item.gift_name || item.description,
        points_change: -item.points_cost,
        image_url: null,
        created_at: item.created_at || new Date().toISOString()
      })));
    }
    
    // 如果没有历史记录，使用默认值
    if (mockHistory.length === 0 && Array.isArray(parsedData.mockHistory)) {
      mockHistory = parsedData.mockHistory;
    }
    
    // 获取总积分
    const mockTotalPoints = parsedData.totalPoints !== undefined ? parsedData.totalPoints : 
                          (parsedData.mockTotalPoints !== undefined ? parsedData.mockTotalPoints : 13);
    
    return { mockHistory, mockTotalPoints };
  } catch (error) {
    console.error('读取数据错误:', error);
    // 返回默认数据
    return {
      mockHistory: [],
      mockTotalPoints: 13
    };
  }
}

// 写入数据函数
function writeData(data) {
  try {
    // 读取现有数据以保留原有的其他字段
    let existingData = {};
    if (fs.existsSync(dataFilePath)) {
      try {
        existingData = JSON.parse(fs.readFileSync(dataFilePath, 'utf8'));
      } catch (e) {
        existingData = {};
      }
    }
    
    // 分离积分记录和兑换记录
    const pointsHistory = [];
    const redemptions = [];
    
    if (Array.isArray(data.mockHistory)) {
      data.mockHistory.forEach(item => {
        if (item.type === 'redemption') {
          // 兑换记录
          redemptions.push({
            _id: item._id,
            gift_name: item.description,
            points_cost: Math.abs(item.points_change),
            created_at: item.created_at
          });
        } else {
          // 积分记录
          pointsHistory.push({
            _id: item._id,
            description: item.description,
            points_change: item.points_change,
            image_url: item.image_url,
            created_at: item.created_at
          });
        }
      });
    }
    
    // 合并数据并保留原有字段
    const mergedData = {
      ...existingData,
      rewards: existingData.rewards || [],
      pointsHistory: pointsHistory,
      redemptions: redemptions,
      totalPoints: data.mockTotalPoints,
      // 保留兼容性字段
      mockHistory: data.mockHistory,
      mockTotalPoints: data.mockTotalPoints
    };
    
    fs.writeFileSync(dataFilePath, JSON.stringify(mergedData, null, 2));
  } catch (error) {
    console.error('写入数据错误:', error);
  }
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

// 先添加静态文件服务中间件
app.use(express.static('public'));
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// 配置body解析器中间件
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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

// 模拟数据 - 从文件中读取
let mockData = readData();
let { mockHistory, mockTotalPoints } = mockData;

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
    // 调试日志：查看req.body和req.file
    console.log('----- 请求开始 -----');
    console.log('req.body:', req.body);
    console.log('req.body.points_change原始值:', req.body ? req.body.points_change : 'undefined');
    console.log('req.file:', req.file);
    
    // 直接获取和解析参数
    const description = req.body?.description || '';
    const points_change_str = req.body?.points_change || '';
    const type = req.body?.type || 'default';
    
    console.log('points_change_str:', points_change_str);
    
    // 安全地解析points_change
    const parsedPointsChange = parseInt(points_change_str, 10);
    const validPointsChange = isNaN(parsedPointsChange) ? 0 : parsedPointsChange;
    
    console.log('parsedPointsChange:', parsedPointsChange);
    console.log('validPointsChange:', validPointsChange);
    
    // 处理图片
    let imageUrl = null;
    if (req.file) {
      imageUrl = '/uploads/' + req.file.filename;
    }
    
    // 创建新记录
    const newRecord = {
      type,
      description,
      points_change: validPointsChange,
      image_url: imageUrl,
      created_at: new Date().toISOString()
    };
    
    console.log('newRecord:', newRecord);
    
    // 使用模拟数据
    const mockId = 'mock' + Date.now();
    const mockRecord = {
      _id: mockId,
      ...newRecord
    };
    
    mockHistory.unshift(mockRecord);
    mockTotalPoints += validPointsChange;
    
    console.log('mockTotalPoints更新后:', mockTotalPoints);
    
    // 保存数据到文件
    mockData = { mockHistory, mockTotalPoints };
    writeData(mockData);
    
    console.log('数据已保存');
    console.log('----- 请求结束 -----');
    
    res.json(mockRecord);
  } catch (error) {
    console.error('添加积分记录错误:', error);
    
    res.status(500).json({
      error: '添加积分记录失败',
      message: error.message
    });
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
      
      // 保存数据到文件
      mockData = { mockHistory, mockTotalPoints };
      writeData(mockData);
      
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
      
      // 保存数据到文件
      mockData = { mockHistory, mockTotalPoints };
      writeData(mockData);
    
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

// 删除历史记录
app.delete('/api/history/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const db = await connectToDatabase().catch(() => null);
    
    if (db) {
      // 尝试从points_history集合中删除
      let result = await db.collection('points_history').deleteOne({ _id: new ObjectId(id) });
      
      // 如果points_history中没有找到，尝试从redemptions集合中删除
      if (result.deletedCount === 0) {
        result = await db.collection('redemptions').deleteOne({ _id: new ObjectId(id) });
      }
      
      if (result.deletedCount > 0) {
        res.json({ success: true, message: '记录已删除' });
      } else {
        res.status(404).json({ success: false, message: '记录不存在' });
      }
    } else {
      // 模拟删除记录
      const index = mockHistory.findIndex(item => item._id === id);
      if (index !== -1) {
        // 如果是删除兑换记录，需要恢复积分
        const deletedItem = mockHistory[index];
        if (deletedItem.type === 'redemption') {
          mockTotalPoints += Math.abs(deletedItem.points_change);
        } else {
          mockTotalPoints -= deletedItem.points_change;
        }
        
        mockHistory.splice(index, 1);
        
        // 保存数据到文件
        mockData = { mockHistory, mockTotalPoints };
        writeData(mockData);
        res.json({ success: true, message: '记录已删除' });
      } else {
        res.status(404).json({ success: false, message: '记录不存在' });
      }
    }
  } catch (error) {
    console.error('删除记录错误:', error);
    res.status(500).json({ success: false, message: '删除失败' });
  }
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