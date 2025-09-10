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
    
    // 图片预览功能
    const modal = document.getElementById('imageModal');
    const modalImg = document.getElementById('modalImage');
    const closeBtn = document.querySelector('.close');
    
    // 点击图片显示大图
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('history-image')) {
            modal.style.display = 'block';
            modalImg.src = e.target.src;
        }
    });
    
    // 点击关闭按钮
    closeBtn.onclick = () => {
        modal.style.display = 'none';
    };
    
    // 点击模态框背景关闭
    modal.onclick = (e) => {
        if (e.target === modal) {
            modal.style.display = 'none';
        }
    };
});

// 加载总积分
async function loadTotalPoints() {
    try {
        const response = await fetch(`${API_BASE}/total-points`);
        const data = await response.json();
        document.getElementById('totalPoints').textContent = data.total;
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
            const isRedemption = item.hasOwnProperty('gift_name');
            const pointsChange = isRedemption ? -item.points_cost : item.points_change;
            const pointsClass = pointsChange > 0 ? 'positive' : 'negative';
            const icon = isRedemption ? '🎁' : '📝';
            const description = isRedemption ? 
                `兑换了 ${item.gift_name}` : 
                item.description;
            
            return `
                <div class="history-item">
                    <div class="history-info">
                        <span class="history-icon">${icon}</span>
                        <span class="history-desc">${description}</span>
                        <span class="history-points ${pointsClass}">${pointsChange > 0 ? '+' : ''}${pointsChange}</span>
                        <span class="history-time">${formatTime(item.created_at)}</span>
                    </div>
                    ${item.image_url ? `
                        <img src="${item.image_url}" alt="记录图片" class="history-image" 
                             onerror="this.style.display='none'">
                    ` : ''}
                </div>
            `;
        }).join('');
    } catch (error) {
        console.error('加载历史记录失败:', error);
    }
}

// 添加积分记录
async function addPointsRecord() {
    const description = document.getElementById('recordDesc').value.trim();
    const points = document.getElementById('recordPoints').value;
    const imageFile = document.getElementById('recordImage').files[0];
    
    if (!description || !points) {
        alert('请填写事项描述和积分值');
        return;
    }
    
    const formData = new FormData();
    formData.append('description', description);
    formData.append('points_change', points);
    if (imageFile) {
        formData.append('image', imageFile);
    }
    
    try {
        const response = await fetch(`${API_BASE}/points`, {
            method: 'POST',
            body: formData
        });
        
        if (response.ok) {
            document.getElementById('recordDesc').value = '';
            document.getElementById('recordPoints').value = '';
            document.getElementById('recordImage').value = '';
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