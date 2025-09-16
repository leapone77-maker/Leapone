const API_BASE = '/api';

// 页面加载时初始化
document.addEventListener('DOMContentLoaded', () => {
    loadTotalPoints();
    loadHistory();
    
    // 每30秒刷新一次数据
    setInterval(() => {
        loadTotalPoints();
        loadHistory();
    }, 30000);
    
    // 初始化API基础URL
    window.API_BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' ? 
        '' : window.location.pathname.replace(/\/*$/, '');
});

// 加载总积分
async function loadTotalPoints() {
    try {
        const response = await fetch(`${API_BASE}/total-points`);
        const data = await response.json();
        document.getElementById('totalPoints').textContent = data.total_points;
    } catch (error) {
        console.error('加载总积分失败:', error);
    }
}

// 加载历史记录
async function loadHistory() {
    try {
        const response = await fetch(`${API_BASE}/history`);
        const history = await response.json();
        const historyList = document.getElementById('historyList');
        
        historyList.innerHTML = history.map(item => {
            const isRedemption = item.type === 'redemption';
            const pointsChange = isRedemption ? item.points_change : item.points_change;
            const pointsClass = pointsChange > 0 ? 'positive' : 'negative';
            const icon = isRedemption ? '🎁' : '📝';
            const description = item.description;
            
            // 图片HTML
            const imageHtml = item.image_url ? 
                `<div class="history-image">
                    <span>🖼️</span>
                    <img src="${API_BASE}${item.image_url}" onclick="openImageModal('${API_BASE}${item.image_url}')" alt="记录图片">
                </div>` : 
                '';
            
            return `
                <div class="history-item">
                    <div class="history-info">
                        <span class="history-icon">${icon}</span>
                        <span class="history-desc">${description}</span>
                        <span class="history-points ${pointsClass}">${pointsChange > 0 ? '+' : ''}${pointsChange}</span>
                        <span class="history-time">${formatTime(item.created_at)}</span>
                    </div>
                    ${imageHtml}
                </div>
            `;
        }).join('');
    } catch (error) {
        console.error('加载历史记录失败:', error);
    }
}

// 打开图片预览模态框
function openImageModal(imageUrl) {
    const modal = document.getElementById('imageModal');
    const modalImg = document.getElementById('modalImage');
    modal.style.display = "block";
    modalImg.src = imageUrl;
}

// 关闭图片预览模态框
function closeImageModal() {
    const modal = document.getElementById('imageModal');
    modal.style.display = "none";
}

// 添加积分记录
async function addPointsRecord() {
    const description = document.getElementById('recordDesc').value.trim();
    const points = document.getElementById('recordPoints').value;
    const imageInput = document.getElementById('recordImage');
    
    if (!description || !points) {
        alert('请填写事项描述和积分值');
        return;
    }
    
    try {
        // 使用FormData来支持文件上传
        const formData = new FormData();
        formData.append('description', description);
        formData.append('points_change', parseInt(points));
        
        // 如果有选择图片，添加到FormData
        if (imageInput.files && imageInput.files[0]) {
            formData.append('image', imageInput.files[0]);
        }
        
        const response = await fetch(`${API_BASE}/points`, {
            method: 'POST',
            body: formData
        });
        
        if (response.ok) {
            // 重置表单
            document.getElementById('recordDesc').value = '';
            document.getElementById('recordPoints').value = '';
            imageInput.value = '';
            
            // 刷新数据
            loadTotalPoints();
            loadHistory();
        } else {
            alert('添加记录失败');
        }
    } catch (error) {
        console.error('添加记录失败:', error);
        alert('添加记录失败');
    }
}

// 积分兑换
async function redeemGift() {
    const giftName = document.getElementById('giftName').value.trim();
    const giftCost = document.getElementById('giftCost').value;
    
    if (!giftName || !giftCost) {
        alert('请填写礼物名称和所需积分');
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/redemptions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                gift_name: giftName,
                points_cost: parseInt(giftCost)
            })
        });
        
        if (response.ok) {
            document.getElementById('giftName').value = '';
            document.getElementById('giftCost').value = '';
            loadTotalPoints();
            loadHistory();
        } else {
            const error = await response.json();
            alert(error.error || '兑换失败');
        }
    } catch (error) {
        console.error('兑换失败:', error);
        alert('兑换失败');
    }
}

// 格式化时间
function formatTime(timestamp) {
    const date = new Date(timestamp);
    return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
}