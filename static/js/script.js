/**
 * yt-dlp Web UI - 前端JavaScript逻辑
 */

// 全局状态
let currentFormats = null;
let currentTaskId = null;
let pollInterval = null;
let selectedFormats = {
    video: null,
    audio: null,
    subtitle: null
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
function updateStatus(message, showDownloadLink = false, downloadUrl = '') {
    const statusDiv = document.getElementById('statusMessage');
    const statusContent = document.getElementById('statusContent');
    const downloadLink = document.getElementById('downloadLink');
    
    statusContent.textContent = message;
    statusDiv.classList.add('show');
    
    if (showDownloadLink && downloadUrl) {
        downloadLink.href = downloadUrl;
        downloadLink.classList.add('show');
    } else {
        downloadLink.classList.remove('show');
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
    ['video', 'audio', 'subtitle'].forEach(type => {
        if (data.formats && data.formats[type]) {
            formatCount += data.formats[type].length;
        }
    });
    document.getElementById('formatCount').textContent = formatCount;
}

/**
 * 显示格式列表
 */
function displayFormats(formats) {
    // 显示视频格式
    displayVideoFormats(formats.video || []);
    
    // 显示音频格式
    displayAudioFormats(formats.audio || []);
    
    // 显示字幕格式
    displaySubtitleFormats(formats.subtitle || []);
    
    // 检查哪些分类有内容
    const categories = ['video', 'audio', 'subtitle'];
    categories.forEach(category => {
        const tableBody = document.getElementById(`${category}TableBody`);
        if ((formats[category] || []).length === 0) {
            tableBody.innerHTML = `<tr><td colspan="7" class="empty-message">没有可用的${category}格式</td></tr>`;
        }
    });
}

/**
 * 显示视频格式表格
 */
function displayVideoFormats(videoFormats) {
    const tableBody = document.getElementById('videoTableBody');
    tableBody.innerHTML = '';
    
    videoFormats.forEach(format => {
        const row = document.createElement('tr');
        
        // 格式化文件大小
        const fileSize = format.filesize ? 
            (format.filesize / (1024 * 1024)).toFixed(2) + ' MB' : 
            '未知';
        
        // 格式化码率
        const bitrate = format.tbr ? 
            format.tbr.toFixed(0) + ' kbps' : 
            '未知';
        
        row.innerHTML = `
            <td><input type="radio" name="videoFormat" value="${format.format_id}" 
                   onchange="selectFormat('video', '${format.format_id}')"></td>
            <td><code>${format.format_id}</code></td>
            <td><strong>${format.ext.toUpperCase()}</strong></td>
            <td>${format.resolution || '未知'}</td>
            <td><small>${format.vcodec || '未知'}</small></td>
            <td>${fileSize}</td>
            <td>${bitrate}</td>
        `;
        
        tableBody.appendChild(row);
    });
}

/**
 * 显示音频格式表格
 */
function displayAudioFormats(audioFormats) {
    const tableBody = document.getElementById('audioTableBody');
    tableBody.innerHTML = '';
    
    audioFormats.forEach(format => {
        const row = document.createElement('tr');
        
        // 格式化文件大小
        const fileSize = format.filesize ? 
            (format.filesize / (1024 * 1024)).toFixed(2) + ' MB' : 
            '未知';
        
        // 格式化码率
        const bitrate = format.tbr ? 
            format.tbr.toFixed(0) + ' kbps' : 
            '未知';
        
        // 获取采样率
        const sampleRate = format.asr ? 
            (format.asr / 1000).toFixed(1) + ' kHz' : 
            '未知';
        
        row.innerHTML = `
            <td><input type="radio" name="audioFormat" value="${format.format_id}"
                   onchange="selectFormat('audio', '${format.format_id}')"></td>
            <td><code>${format.format_id}</code></td>
            <td><strong>${format.ext.toUpperCase()}</strong></td>
            <td><small>${format.acodec || '未知'}</small></td>
            <td>${fileSize}</td>
            <td>${bitrate}</td>
            <td>${sampleRate}</td>
        `;
        
        tableBody.appendChild(row);
    });
}

/**
 * 显示字幕格式表格
 */
function displaySubtitleFormats(subtitleFormats) {
    const tableBody = document.getElementById('subtitleTableBody');
    tableBody.innerHTML = '';
    
    // 如果没有字幕格式
    if (subtitleFormats.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="5" style="text-align: center; padding: 30px; color: #7f8c8d;">
                    没有可用的字幕格式
                </td>
            </tr>
        `;
        return;
    }
    
    subtitleFormats.forEach(format => {
        const row = document.createElement('tr');
        
        row.innerHTML = `
            <td><input type="checkbox" name="subtitleFormat" value="${format.format_id}"
                   onchange="selectFormat('subtitle', '${format.format_id}', this.checked)"></td>
            <td><code>${format.format_id}</code></td>
            <td><strong>${format.ext.toUpperCase()}</strong></td>
            <td>${format.language || '未知'}</td>
            <td>${format.note || ''}</td>
        `;
        
        tableBody.appendChild(row);
    });
}

/**
 * 选择特定格式
 */
function selectFormat(type, formatId, isChecked = true) {
    if (type === 'video' || type === 'audio') {
        selectedFormats[type] = isChecked ? formatId : null;
        
        // 如果是单选按钮，需要更新UI
        if (type === 'video') {
            document.querySelectorAll(`input[name="videoFormat"]`).forEach(radio => {
                radio.checked = radio.value === formatId;
            });
        } else if (type === 'audio') {
            document.querySelectorAll(`input[name="audioFormat"]`).forEach(radio => {
                radio.checked = radio.value === formatId;
            });
        }
    } else if (type === 'subtitle') {
        if (isChecked) {
            selectedFormats.subtitle = formatId;
        } else {
            selectedFormats.subtitle = null;
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
        updateStatus('下载任务已开始，请等待...');
        
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
        // 验证是否选择了必要的格式
        if (!selectedFormats.video) {
            showError('请选择视频格式');
            return null;
        }
        if (!selectedFormats.audio) {
            showError('请选择音频格式');
            return null;
        }
        
        params.formats = {
            video: selectedFormats.video,
            audio: selectedFormats.audio,
            subtitle: selectedFormats.subtitle || null
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
                    updateStatus('下载完成！', true, data.download_url);
                    
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
        updateStatus('下载已取消');
        
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
 * 显示指定标签页
 */
function showTab(tabName) {
    // 更新激活的标签
    document.querySelectorAll('.tab').forEach(tab => {
        tab.classList.toggle('active', tab.getAttribute('data-tab') === tabName);
    });
    
    // 更新激活的表格
    document.querySelectorAll('.format-table').forEach(table => {
        table.classList.toggle('active', table.id === tabName + 'Table');
    });
}

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
    ['videoTableBody', 'audioTableBody', 'subtitleTableBody'].forEach(id => {
        document.getElementById(id).innerHTML = '';
    });
    
    // 清空选择
    selectedFormats = { video: null, audio: null, subtitle: null };
    
    // 清空进度和状态
    updateProgress(0, '');
    document.getElementById('progressContainer').classList.remove('show');
    document.getElementById('statusMessage').classList.remove('show');
}