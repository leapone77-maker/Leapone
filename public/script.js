// 页面加载时初始化
document.addEventListener('DOMContentLoaded', () => {
    // 显示加载动画
    showLoading();
    
    // 加载数据
    Promise.all([loadTotalPoints(), loadHistory()])
        .finally(() => {
            // 隐藏加载动画
            hideLoading();
        });
    
    // 每30秒刷新一次数据
    setInterval(() => {
        // 显示加载动画
        showLoading();
        
        Promise.all([loadTotalPoints(), loadHistory()])
            .finally(() => {
                // 隐藏加载动画
                hideLoading();
            });
    }, 30000);
    
    // 添加图片上传预览功能
    const imageInput = document.getElementById('recordImage');
    const removeImageBtn = document.getElementById('removeImageBtn');
    
    // 监听文件选择变化
    imageInput.addEventListener('change', function() {
        if (this.files && this.files[0]) {
            showImagePreview(this.files[0]);
        }
    });
    
    // 监听移除图片按钮点击
    removeImageBtn.addEventListener('click', clearImagePreview);
});

// 显示图片预览
function showImagePreview(file) {
    const reader = new FileReader();
    
    reader.onload = function(e) {
        const previewContainer = document.getElementById('imagePreviewContainer');
        const previewImage = document.getElementById('imagePreview');
        
        previewImage.src = e.target.result;
        previewContainer.style.display = 'flex';
    }
    
    reader.readAsDataURL(file);
}

// 清除图片预览
function clearImagePreview() {
    const previewContainer = document.getElementById('imagePreviewContainer');
    const previewImage = document.getElementById('imagePreview');
    const imageInput = document.getElementById('recordImage');
    
    previewImage.src = '';
    previewContainer.style.display = 'none';
    imageInput.value = '';
}

// 加载总积分
async function loadTotalPoints() {
    try {
        const response = await fetch('/api/total-points');
        const data = await response.json();
        document.getElementById('totalPoints').textContent = data.total_points;
    } catch (error) {
        console.error('加载总积分失败:', error);
    }
}

// 加载历史记录
async function loadHistory() {
    try {
        const response = await fetch('/api/history');
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
                    <img src="${item.image_url}" onclick="openImageModal('${item.image_url}')" alt="记录图片">
                </div>` : 
                '';
            
            return `
                <div class="history-item">
                    <div class="history-info">
                        <span class="history-icon">${icon}</span>
                        <span class="history-desc">${description}</span>
                        <span class="history-points ${pointsClass}">${pointsChange > 0 ? '+' : ''}${pointsChange}</span>
                        <span class="history-time">${formatTime(item.created_at)}</span>
                        <button class="delete-btn" data-id="${item._id}">删除</button>
                    </div>
                    ${imageHtml}
                </div>
            `;
        }).join('');
        
        // 渲染完成后，给删除按钮添加事件监听
        deleteHistoryRecord();
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

// 显示加载覆盖层
function showLoading() {
    document.getElementById('loadingOverlay').style.display = 'flex';
}

// 隐藏加载覆盖层
function hideLoading() {
    document.getElementById('loadingOverlay').style.display = 'none';
}

// 启用/禁用按钮
function setButtonLoading(button, isLoading) {
    if (button) {
        button.disabled = isLoading;
        if (isLoading) {
            button.classList.add('loading');
        } else {
            button.classList.remove('loading');
        }
    }
}

// 添加积分记录
async function addPointsRecord() {
    const description = document.getElementById('recordDesc').value.trim();
    const points = document.getElementById('recordPoints').value;
    const imageInput = document.getElementById('recordImage');
    const button = event.currentTarget || document.querySelector('button[onclick="addPointsRecord()"]');
    
    if (!description || !points) {
        alert('请填写事项描述和积分值');
        return;
    }
    
    try {
        // 显示加载状态
        setButtonLoading(button, true);
        showLoading();
        
        // 使用FormData来支持文件上传
        const formData = new FormData();
        formData.append('description', description);
        formData.append('points_change', parseInt(points));
        
        // 如果有选择图片，添加到FormData
        if (imageInput.files && imageInput.files[0]) {
            formData.append('image', imageInput.files[0]);
        }
        
        const response = await fetch('/api/points', {
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
    } finally {
        // 隐藏加载状态
        setButtonLoading(button, false);
        hideLoading();
    }
}

// 积分兑换
async function redeemGift() {
    const giftName = document.getElementById('giftName').value.trim();
    const giftCost = document.getElementById('giftCost').value;
    const button = event.currentTarget || document.querySelector('button[onclick="redeemGift()"]');
    
    if (!giftName || !giftCost) {
        alert('请填写礼物名称和所需积分');
        return;
    }
    
    try {
        // 显示加载状态
        setButtonLoading(button, true);
        showLoading();
        
        const response = await fetch('/api/redemptions', {
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
    } finally {
        // 隐藏加载状态
        setButtonLoading(button, false);
        hideLoading();
    }
}

// 格式化时间
function formatTime(timestamp) {
    const date = new Date(timestamp);
    return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
}

// 删除历史记录
function deleteHistoryRecord() {
    // 给所有删除按钮添加点击事件
    document.querySelectorAll('.delete-btn').forEach(button => {
        button.addEventListener('click', async (e) => {
            const recordId = e.target.dataset.id;
            
            // 显示确认提示
            if (confirm('确定要删除这条记录吗？')) {
                try {
                    // 显示加载状态
                    setButtonLoading(e.target, true);
                    showLoading();
                    
                    const response = await fetch(`/api/history/${recordId}`, {
                        method: 'DELETE'
                    });
                    
                    const result = await response.json();
                    
                    if (result.success) {
                        // 刷新数据
                        loadTotalPoints();
                        loadHistory();
                    } else {
                        alert(result.message || '删除失败');
                    }
                } catch (error) {
                    console.error('删除记录失败:', error);
                    alert('删除记录失败');
                } finally {
                    // 隐藏加载状态
                    setButtonLoading(e.target, false);
                    hideLoading();
                }
            }
        });
    });
}