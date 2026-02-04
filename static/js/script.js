/**
 * yt-dlp Web UI - 前端JavaScript逻辑
 */

// 全局状态
let currentFormats = null;
let currentTaskId = null;
let pollInterval = null;
let selectedFormats = {
    video: [],
    audio: [],
    combined: [],
    subtitle: []
};

/**
 * 显示错误消息
 */
function showError(message) {
    const errorDiv = document.getElementById('errorMessage');
    errorDiv.textContent = message;
    errorDiv.classList.add('show');
    
    // 5秒后自动隐藏
    setTimeout(() => {
        errorDiv.classList.remove('show');
    }, 5000);
}

/**
 * 显示加载指示器
 */
function showLoading(text = '正在处理...') {
    const loadingDiv = document.getElementById('loading');
    document.getElementById('loadingText').textContent = text;
    loadingDiv.style.display = 'block';
}

/**
 * 隐藏加载指示器
 */
function hideLoading() {
    const loadingDiv = document.getElementById('loading');
    loadingDiv.style.display = 'none';
}

/**
 * 更新进度显示
 */
function updateProgress(percent, message = '') {
    const progressFill = document.getElementById('progressFill');
    const progressText = document.getElementById('progressText');
    const progressMessage = document.getElementById('progressMessage');
    const progressContainer = document.getElementById('progressContainer');
    
    if (percent >= 0) {
        progressFill.style.width = percent + '%';
        progressText.textContent = percent + '%';
        progressMessage.textContent = message;
        
        if (!progressContainer.classList.contains('show')) {
            progressContainer.classList.add('show');
        }
    }
}

/**
 * 更新状态消息
 */
function updateStatus(message, showOpenFolder = false) {
    const statusDiv = document.getElementById('statusMessage');
    const statusContent = document.getElementById('statusContent');
    const openFolderBtn = document.getElementById('openFolderBtn');
    
    statusContent.textContent = message;
    statusDiv.classList.add('show');
    
    if (showOpenFolder) {
        openFolderBtn.classList.add('show');
    } else {
        openFolderBtn.classList.remove('show');
    }
}

/**
 * 打开下载文件夹
 */
async function openDownloadFolder() {
    try {
        const response = await fetch('/api/open-folder', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            }
        });
        
        if (!response.ok) {
            const data = await response.json();
            throw new Error(data.error || '无法打开文件夹');
        }
    } catch (error) {
        showError('打开文件夹失败: ' + error.message);
        console.error('打开文件夹时出错:', error);
    }
}

/**
 * 解析URL，获取视频信息和格式列表
 */
async function parseUrl() {
    const urlInput = document.getElementById('urlInput');
    const url = urlInput.value.trim();
    
    if (!url) {
        showError('请输入有效的视频URL');
        return;
    }
    
    try {
        // 显示加载状态
        showLoading('正在解析视频信息...');
        const parseBtn = document.getElementById('parseBtn');
        parseBtn.disabled = true;
        
        // 调用后端API
        const response = await fetch('/api/parse', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ url: url })
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || '解析失败');
        }
        
        // 处理返回的数据
        displayVideoInfo(data);
        displayFormats(data.formats);
        
        // 显示视频信息区域
        document.getElementById('videoInfo').classList.add('show');
        document.getElementById('downloadBtn').disabled = false;
        document.getElementById('clearBtn').style.display = 'inline-block';
        
        // 存储格式数据供后续使用
        currentFormats = data;
        
        // 重置选择状态
        selectedFormats = {
            video: [],
            audio: [],
            combined: [],
            subtitle: []
        };
        
        // 清除之前的任务状态
        currentTaskId = null;
        if (pollInterval) {
            clearInterval(pollInterval);
            pollInterval = null;
        }
        
    } catch (error) {
        showError('解析失败: ' + error.message);
        console.error('解析URL时出错:', error);
    } finally {
        hideLoading();
        document.getElementById('parseBtn').disabled = false;
    }
}

/**
 * 显示视频基本信息
 */
function displayVideoInfo(data) {
    document.getElementById('videoTitle').textContent = data.title || '未知标题';
    
    // 格式化时长
    if (data.duration) {
        const minutes = Math.floor(data.duration / 60);
        const seconds = data.duration % 60;
        document.getElementById('duration').textContent = 
            `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }
    
    // 计算格式总数
    let formatCount = 0;
    if (data.formats && Array.isArray(data.formats)) {
        formatCount = data.formats.length;
    }
    document.getElementById('formatCount').textContent = formatCount;
}

/**
 * 显示格式列表（统一表格）
 */
function displayFormats(formats) {
    const tableBody = document.getElementById('formatsTableBody');
    tableBody.innerHTML = '';
    
    // 如果没有格式
    if (!formats || formats.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="9" style="text-align: center; padding: 30px; color: #7f8c8d;">
                    没有可用的格式
                </td>
            </tr>
        `;
        return;
    }
    
    // 显示所有格式
    formats.forEach(format => {
        const row = document.createElement('tr');
        
        // 格式化文件大小
        const fileSize = format.filesize ? 
            (format.filesize / (1024 * 1024)).toFixed(2) + ' MB' : 
            '未知';
        
        // 格式化码率
        const bitrate = format.tbr ? 
            format.tbr.toFixed(0) + ' kbps' : 
            '未知';
        
        // 类型显示
        const typeLabels = {
            'video': '视频',
            'audio': '音频',
            'combined': '音视频',
            'subtitle': '字幕'
        };
        const typeLabel = typeLabels[format.format_type] || format.format_type;
        
        // 分辨率显示
        const resolution = format.resolution || 'N/A';
        
        // 视频编码显示
        const vcodec = format.vcodec && format.vcodec !== 'none' ? format.vcodec : 'N/A';
        
        // 音频编码显示
        const acodec = format.acodec && format.acodec !== 'none' ? format.acodec : 'N/A';
        
        row.innerHTML = `
            <td><input type="checkbox" name="formatSelection" value="${format.format_id}" data-type="${format.format_type}"
                   onchange="selectFormat('${format.format_type}', '${format.format_id}', this.checked)"></td>
            <td><span class="format-type-badge type-${format.format_type}">${typeLabel}</span></td>
            <td><code>${format.format_id}</code></td>
            <td><strong>${format.ext.toUpperCase()}</strong></td>
            <td>${resolution}</td>
            <td><small>${vcodec}</small></td>
            <td><small>${acodec}</small></td>
            <td>${fileSize}</td>
            <td>${bitrate}</td>
        `;
        
        tableBody.appendChild(row);
    });
}

/**
 * 选择特定格式（支持多选）
 */
function selectFormat(type, formatId, isChecked = true) {
    if (type === 'video' || type === 'audio' || type === 'combined' || type === 'subtitle') {
        if (isChecked) {
            // 添加到选择列表
            if (!selectedFormats[type].includes(formatId)) {
                selectedFormats[type].push(formatId);
            }
        } else {
            // 从选择列表移除
            selectedFormats[type] = selectedFormats[type].filter(id => id !== formatId);
        }
    }
}

/**
 * 开始下载
 */
async function startDownload() {
    // 收集下载参数
    const params = collectDownloadParams();
    
    if (!params) {
        return; // 参数验证失败
    }
    
    try {
        // 禁用下载按钮
        const downloadBtn = document.getElementById('downloadBtn');
        const cancelBtn = document.getElementById('cancelBtn');
        downloadBtn.disabled = true;
        cancelBtn.style.display = 'inline-block';
        
        // 显示加载状态
        showLoading('正在准备下载...');
        
        // 调用下载API
        const response = await fetch('/api/download', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(params)
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || '下载启动失败');
        }
        
        // 保存任务ID并开始轮询
        currentTaskId = data.task_id;
        startPolling(currentTaskId);
        
        // 更新界面状态
        updateProgress(0, '任务已排队');
        updateStatus('下载任务已开始，请等待...', false);
        
    } catch (error) {
        showError('启动下载失败: ' + error.message);
        console.error('启动下载时出错:', error);
        
        // 重新启用下载按钮
        document.getElementById('downloadBtn').disabled = false;
        document.getElementById('cancelBtn').style.display = 'none';
    } finally {
        hideLoading();
    }
}

/**
 * 收集下载参数
 */
function collectDownloadParams() {
    const mode = document.querySelector('input[name="downloadMode"]:checked').value;
    const filename = document.getElementById('filename').value.trim();
    const containerFormat = document.getElementById('containerFormat').value;
    
    const params = {
        url: document.getElementById('urlInput').value.trim(),
        mode: mode,
        filename: filename || null,
        container: containerFormat || null
    };
    
    // 根据模式添加不同的参数
    if (mode === 'default') {
        if (!currentFormats || !currentFormats.best_default) {
            showError('无法获取默认最佳格式信息');
            return null;
        }
        params.formats = currentFormats.best_default;
    } else if (mode === 'custom') {
        // 收集所有选中的格式
        const allSelected = [
            ...selectedFormats.video,
            ...selectedFormats.audio,
            ...selectedFormats.combined,
            ...selectedFormats.subtitle
        ];
        
        // 验证是否选择了至少一个格式
        if (allSelected.length === 0) {
            showError('请至少选择一个格式');
            return null;
        }
        
        params.formats = {
            selected: allSelected,
            video: selectedFormats.video,
            audio: selectedFormats.audio,
            combined: selectedFormats.combined,
            subtitle: selectedFormats.subtitle,
            has_separate_streams: currentFormats.has_separate_streams
        };
    }
    
    return params;
}

/**
 * 开始轮询下载状态
 */
function startPolling(taskId) {
    // 清除之前的轮询
    if (pollInterval) {
        clearInterval(pollInterval);
    }
    
    // 设置新的轮询间隔
    pollInterval = setInterval(async () => {
        try {
            const response = await fetch(`/api/status/${taskId}`);
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.error || '获取状态失败');
            }
            
            // 更新进度和状态
            updateProgress(data.progress || 0, data.message || '');
            updateStatus(data.message || '', false);
            
            // 处理不同状态
            switch (data.status) {
                case 'completed':
                    // 下载完成
                    clearInterval(pollInterval);
                    updateProgress(100, '下载完成');
                    updateStatus('下载完成！', true);
                    
                    // 恢复下载按钮
                    document.getElementById('downloadBtn').disabled = false;
                    document.getElementById('cancelBtn').style.display = 'none';
                    break;
                    
                case 'failed':
                    // 下载失败
                    clearInterval(pollInterval);
                    showError('下载失败: ' + (data.error || '未知错误'));
                    updateStatus('下载失败', false);
                    
                    // 恢复下载按钮
                    document.getElementById('downloadBtn').disabled = false;
                    document.getElementById('cancelBtn').style.display = 'none';
                    break;
                    
                case 'downloading':
                case 'queued':
                    // 继续轮询
                    break;
                    
                default:
                    console.warn('未知状态:', data.status);
            }
            
        } catch (error) {
            console.error('轮询状态时出错:', error);
            // 继续尝试，不中断轮询
        }
    }, 1000); // 每秒轮询一次
}

/**
 * 取消下载
 */
function cancelDownload() {
    if (currentTaskId) {
        // 停止轮询
        if (pollInterval) {
            clearInterval(pollInterval);
            pollInterval = null;
        }
        
        // 更新界面状态
        updateProgress(0, '已取消');
        updateStatus('下载已取消', false);
        
        // 恢复下载按钮
        document.getElementById('downloadBtn').disabled = false;
        document.getElementById('cancelBtn').style.display = 'none';
        
        // 注意：后台任务可能仍在运行，实际实现中需要添加取消API
        showError('注意：后台任务可能仍在运行，实际取消功能待实现');
    }
}

/**
 * 初始化页面
 */
document.addEventListener('DOMContentLoaded', function() {
    // 设置URL输入框回车键触发解析
    const urlInput = document.getElementById('urlInput');
    urlInput.addEventListener('keypress', function(event) {
        if (event.key === 'Enter') {
            parseUrl();
        }
    });
    
    // 设置格式标签页点击事件
    document.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', function() {
            const tabName = this.getAttribute('data-tab');
            showTab(tabName);
        });
    });
    
    // 初始化默认显示
    toggleMode();
});

/**
 * 切换下载模式
 */
function toggleMode() {
    const mode = document.querySelector('input[name="downloadMode"]:checked').value;
    const customSection = document.getElementById('customSelection');
    
    if (mode === 'custom') {
        customSection.style.display = 'block';
    } else {
        customSection.style.display = 'none';
    }
}

/**
 * 清空表单
 */
function clearForm() {
    document.getElementById('urlInput').value = '';
    document.getElementById('videoInfo').classList.remove('show');
    document.getElementById('downloadBtn').disabled = true;
    document.getElementById('clearBtn').style.display = 'none';
    
    // 清空格式表格
    document.getElementById('formatsTableBody').innerHTML = '';
    
    // 清空选择
    selectedFormats = { video: [], audio: [], combined: [], subtitle: [] };
    
    // 清空进度和状态
    updateProgress(0, '');
    document.getElementById('progressContainer').classList.remove('show');
    document.getElementById('statusMessage').classList.remove('show');
}