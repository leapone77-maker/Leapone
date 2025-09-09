const fs = require('fs');
const path = require('path');

// 确保数据目录存在
function ensureDataDirectories() {
    const dataDir = path.join(__dirname, 'data');
    const uploadsDir = path.join(__dirname, 'uploads');
    
    if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
        console.log('创建数据目录:', dataDir);
    }
    
    if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
        console.log('创建上传目录:', uploadsDir);
    }
    
    // 初始化空的points.json文件（如果不存在）
    const pointsFile = path.join(dataDir, 'points.json');
    if (!fs.existsSync(pointsFile)) {
        const initialData = {
            pointsHistory: [],
            redemptions: []
        };
        fs.writeFileSync(pointsFile, JSON.stringify(initialData, null, 2));
        console.log('初始化数据文件:', pointsFile);
    }
    
    console.log('数据目录初始化完成');
}

// 执行初始化
ensureDataDirectories();