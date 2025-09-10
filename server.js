const express = require('express');
const multer = require('multer');
const path = require('path');
const cors = require('cors');
const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const PORT = process.env.PORT || 8080;

// Supabase配置 - 使用环境变量
const supabaseUrl = process.env.SUPABASE_URL || 'https://zfbyenwpxslybpfyrrax.supabase.co';
const supabaseKey = process.env.SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpmYnllbndweHNseWJwZnlycmF4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc0MDkxOTQsImV4cCI6MjA3Mjk4NTE5NH0.xo3jSGUdX_ER3xaLoO7Ow0LXv62uxvNYotgI-tTOVpc';
const supabase = createClient(supabaseUrl, supabaseKey);

// 中间件
app.use(cors());
app.use(express.json());
app.use(express.static('public'));
app.use('/uploads', express.static('uploads'));

// 确保目录存在（本地开发环境）
if (!fs.existsSync('uploads')) {
  fs.mkdirSync('uploads');
}
if (!fs.existsSync('data')) {
  fs.mkdirSync('data');
}

// 配置multer使用内存存储（统一使用Supabase Storage）
const upload = multer({ storage: multer.memoryStorage() });

// 初始化数据库表（如果不存在）
async function initDatabase() {
  // 检查points_history表是否存在，如果不存在则创建
  const { error: historyError } = await supabase
    .from('points_history')
    .select('*')
    .limit(1);
    
  if (historyError) {
    console.log('创建points_history表...');
  }

  // 检查redemptions表是否存在，如果不存在则创建
  const { error: redemptionError } = await supabase
    .from('redemptions')
    .select('*')
    .limit(1);
    
  if (redemptionError) {
    console.log('创建redemptions表...');
  }
}

// 路由

// 获取积分历史
app.get('/api/history', async (req, res) => {
  try {
    // 获取积分记录
    const { data: pointsHistory, error: historyError } = await supabase
      .from('points_history')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (historyError) throw historyError;
    
    // 获取兑换记录
    const { data: redemptions, error: redemptionError } = await supabase
      .from('redemptions')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (redemptionError) throw redemptionError;
    
    // 合并记录
    const history = [
      ...pointsHistory.map(item => ({
        ...item,
        type: item.type
      })),
      ...redemptions.map(item => ({
        id: item.id,
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
    const { type, description, points_change } = req.body;
    
    let image_url = null;
    
    if (req.file) {
      // 统一使用Supabase Storage上传图片
      const fileName = `points/${Date.now()}-${req.file.originalname}`;
      const { data, error } = await supabase.storage
        .from('images')
        .upload(fileName, req.file.buffer, {
          contentType: req.file.mimetype
        });
      
      if (error) throw error;
      
      // 获取公开URL
      const { data: urlData } = supabase.storage
        .from('images')
        .getPublicUrl(fileName);
      
      image_url = urlData.publicUrl;
    }

    const newRecord = {
      type,
      description,
      points_change: parseInt(points_change),
      image_url,
      created_at: new Date().toISOString()
    };
    
    // 插入到Supabase
    const { data, error } = await supabase
      .from('points_history')
      .insert([newRecord])
      .select();
    
    if (error) throw error;
    
    res.json(data[0]);
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
    
    // 插入到Supabase
    const { data, error } = await supabase
      .from('redemptions')
      .insert([newRedemption])
      .select();
    
    if (error) throw error;
    
    res.json(data[0]);
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
    // 获取积分记录总和
    const { data: historyData, error: historyError } = await supabase
      .from('points_history')
      .select('points_change');
    
    if (historyError) throw historyError;
    
    const pointsFromHistory = historyData.reduce((sum, item) => sum + item.points_change, 0);
    
    // 获取兑换记录总和
    const { data: redemptionData, error: redemptionError } = await supabase
      .from('redemptions')
      .select('points_cost');
    
    if (redemptionError) throw redemptionError;
    
    const pointsFromRedemptions = redemptionData.reduce((sum, item) => sum - item.points_cost, 0);
    
    return pointsFromHistory + pointsFromRedemptions;
  } catch (error) {
    console.error('计算总积分错误:', error);
    throw error;
  }
}

// 提供前端页面
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 初始化数据库
initDatabase();

app.listen(PORT, () => {
  console.log(`服务器运行在 http://localhost:${PORT}`);
});