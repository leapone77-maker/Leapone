const API_BASE = '/api';

// 页面加载时初始化
document.addEventListener('DOMContentLoaded', () => {
    loadTotalPoints();
    loadRewards();
    loadHistory();
    
    // 每30秒刷新一次数据
    setInterval(() => {
        loadTotalPoints();
        loadHistory();
    }, 30000);
});

// 加载总积分
async function loadTotalPoints() {
    try {
        const response = await fetch(`${API_BASE}/total-points`);
        const data = await response.json();
        document.getElementById('totalPoints').textContent = data.total_points;
    } catch (error) {
        console.error('加载积分失败:', error);
    }
}

// 加载奖励项目
async function loadRewards() {
    try {
        const response = await fetch(`${API_BASE}/rewards`);
        const rewards = await response.json();
        const rewardsList = document.getElementById('rewardsList');
        
        rewardsList.innerHTML = rewards.map(reward => `
            <div class="reward-card">
                <h3>${reward.name}</h3>
                <div class="reward-points">+${reward.points} 积分</div>
                <button class="delete-btn" onclick="deleteReward(${reward.id})">
                    删除
                </button>
            </div>
        `).join('');
    } catch (error) {
        console.error('加载奖励失败:', error);
    }
}

// 创建奖励项目
async function createReward() {
    const name = document.getElementById('rewardName').value.trim();
    const points = parseInt(document.getElementById('rewardPoints').value);
    
    if (!name || !points || points <= 0) {
        alert('请输入有效的奖励名称和积分值！');
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/rewards`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ name, points })
        });
        
        if (response.ok) {
            document.getElementById('rewardName').value = '';
            document.getElementById('rewardPoints').value = '';
            loadRewards();
        } else {
            alert('创建奖励失败');
        }
    } catch (error) {
        console.error('创建奖励失败:', error);
    }
}

// 删除奖励项目
async function deleteReward(id) {
    if (!confirm('确定要删除这个奖励项目吗？')) {
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/rewards/${id}`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            loadRewards();
        } else {
            alert('删除奖励失败');
        }
    } catch (error) {
        console.error('删除奖励失败:', error);
    }
}

// 添加积分记录
async function addPointsRecord() {
    const type = document.getElementById('recordType').value;
    const description = document.getElementById('recordDesc').value.trim();
    const points = parseInt(document.getElementById('recordPoints').value);
    const imageFile = document.getElementById('recordImage').files[0];
    
    if (!description || !points || points <= 0) {
        alert('请输入有效的事项描述和积分值！');
        return;
    }

    const pointsChange = type === 'earn' ? points : -points;

    try {
        const formData = new FormData();
        formData.append('type', type);
        formData.append('description', description);
        formData.append('points_change', pointsChange.toString());
        if (imageFile) {
            formData.append('image', imageFile);
        }

        const response = await fetch(`${API_BASE}/points`, {
            method: 'POST',
            body: formData
        });
        
        if (response.ok) {
            // 清空表单
            document.getElementById('recordDesc').value = '';
            document.getElementById('recordPoints').value = '';
            document.getElementById('recordImage').value = '';
            
            // 刷新数据
            loadTotalPoints();
            loadHistory();
        } else {
            alert('记录积分失败');
        }
    } catch (error) {
        console.error('记录积分失败:', error);
    }
}

// 积分兑换
async function redeemGift() {
    const giftName = document.getElementById('giftName').value.trim();
    const pointsCost = parseInt(document.getElementById('giftCost').value);
    
    if (!giftName || !pointsCost || pointsCost <= 0) {
        alert('请输入有效的礼物名称和积分值！');
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/redemptions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ gift_name: giftName, points_cost: pointsCost })
        });
        
        if (response.ok) {
            document.getElementById('giftName').value = '';
            document.getElementById('giftCost').value = '';
            loadTotalPoints();
            loadHistory();
        } else if (response.status === 400) {
            alert('积分不足，无法兑换！');
        } else {
            alert('兑换失败');
        }
    } catch (error) {
        console.error('兑换失败:', error);
    }
}

// 加载历史记录
async function loadHistory() {
    try {
        const response = await fetch(`${API_BASE}/history`);
        const history = await response.json();
        const historyList = document.getElementById('historyList');
        
        historyList.innerHTML = history.map(item => {
            const date = new Date(item.created_at).toLocaleString('zh-CN');
            const points = parseInt(item.points_change);
            const isPositive = points > 0;
            
            let typeClass = '';
            let description = '';
            let icon = '';
            
            if (item.type === 'redemption') {
                typeClass = 'redemption';
                description = `兑换了: ${item.description}`;
                icon = '🎁';
            } else {
                typeClass = isPositive ? 'earn' : 'deduct';
                description = item.description;
                icon = isPositive ? '➕' : '➖';
            }
            
            return `
                <div class="history-item ${typeClass}">
                    ${item.image_url ? `
                        <img src="${item.image_url}" alt="记录图片" class="history-image">
                    ` : `<div class="history-icon">${icon}</div>`}
                    <div class="history-details">
                        <div class="history-desc">${description}</div>
                        <div class="history-date">${date}</div>
                    </div>
                    <div class="history-points ${isPositive ? 'positive' : 'negative'}">
                        ${isPositive ? '+' : ''}${points} 积分
                    </div>
                </div>
            `;
        }).join('');
    } catch (error) {
        console.error('加载历史记录失败:', error);
    }
}