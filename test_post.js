// 简单的测试脚本，使用Node.js的http模块发送POST请求
const http = require('http');
const querystring = require('querystring');

// 准备请求数据
const postData = querystring.stringify({
  description: '测试脚本发送的记录',
  points_change: '8'
});

// 配置请求选项
const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/points',
  method: 'POST',
  headers: {
    'Content-Type': 'application/x-www-form-urlencoded',
    'Content-Length': Buffer.byteLength(postData)
  }
};

// 发送请求
const req = http.request(options, (res) => {
  console.log(`状态码: ${res.statusCode}`);
  res.on('data', (chunk) => {
    console.log(`响应体: ${chunk}`);
  });
});

req.on('error', (e) => {
  console.error(`请求错误: ${e.message}`);
});

// 写入请求体
req.write(postData);
req.end();