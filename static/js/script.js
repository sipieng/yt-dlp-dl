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
    
    // 错误消息一直保留，直到用户点击清空按钮或输入新URL
}

/**
 * 显示加载指示器
 */
function showLoading(text = '正在处理…') {
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
    // Docker 环境下不执行此函数
    if (window.isDocker) return;

    const statusDiv = document.getElementById('statusMessage');
    const statusContent = document.getElementById('statusContent');
    const openFolderBtn = document.getElementById('openFolderBtn');

    if (!statusDiv || !statusContent || !openFolderBtn) return;

    statusContent.textContent = message;

    // 如果消息为空，隐藏整个状态区域
    if (!message) {
        statusDiv.classList.remove('show');
    } else {
        statusDiv.classList.add('show');
    }

    if (showOpenFolder) {
        openFolderBtn.classList.add('show');
    } else {
        openFolderBtn.classList.remove('show');
    }
}

/**
 * 显示下载链接（Docker 环境）
 */
function showDownloadLink(downloadUrl, filename) {
    const container = document.getElementById('downloadLinkContainer');
    const content = document.getElementById('downloadLinkContent');

    if (!container || !content) return;

    content.innerHTML = `
        <div style="display: flex; gap: 10px; align-items: center;">
            <a href="${downloadUrl}" download="${filename}" style="padding: 10px 20px; background: #27ae60; color: white; text-decoration: none; border-radius: 4px; display: inline-block;">
                ⬇️ 保存文件
            </a>
            <span style="color: #7f8c8d; font-size: 14px;">${filename}</span>
        </div>
    `;

    container.style.display = 'block';
}

/**
 * 隐藏下载链接（Docker 环境）
 */
function hideDownloadLink() {
    const container = document.getElementById('downloadLinkContainer');
    if (container) {
        container.style.display = 'none';
    }
}

/**
 * 打开下载文件夹（本地）/ 显示下载文件列表（Docker）
 */
async function openDownloadFolder() {
    try {
        // 获取当前选择的下载路径
        const outputPath = document.getElementById('outputPath').value.trim() || 'downloads/';

        const response = await fetch('/api/open-folder', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ path: outputPath })
        });

        if (!response.ok) {
            const data = await response.json();
            throw new Error(data.error || '无法打开文件夹');
        }

        const data = await response.json();

        // Docker 环境：显示下载文件列表
        if (data.is_docker) {
            showDownloadFilesList(data.files, data.folder_path);
        }
        // 本地环境：后端已经打开系统文件夹
    } catch (error) {
        showError('打开文件夹失败: ' + error.message);
        console.error('打开文件夹时出错:', error);
    }
}

/**
 * 显示下载文件列表（Docker 环境）
 */
function showDownloadFilesList(files, folderPath) {
    // 创建模态框
    const modal = document.createElement('div');
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 1000;
    `;

    // 创建内容区域
    const content = document.createElement('div');
    content.style.cssText = `
        background: white;
        border-radius: 8px;
        padding: 20px;
        max-width: 600px;
        width: 90%;
        max-height: 80vh;
        overflow: hidden;
        display: flex;
        flex-direction: column;
    `;

    // 标题
    const title = document.createElement('h3');
    title.textContent = '下载文件列表';
    title.style.marginBottom = '15px';

    // 路径显示
    const pathInfo = document.createElement('p');
    pathInfo.style.cssText = 'margin-bottom: 10px; color: #7f8c8d; font-size: 14px;';
    pathInfo.textContent = `路径: ${folderPath}`;

    // 文件列表
    const list = document.createElement('div');
    list.style.cssText = 'flex: 1; overflow-y: auto; border: 1px solid #ddd; border-radius: 4px; margin-bottom: 15px;';

    if (files.length === 0) {
        list.innerHTML = '<div style="padding: 20px; text-align: center; color: #7f8c8d;">暂无下载文件</div>';
    } else {
        files.forEach(file => {
            const item = document.createElement('div');
            item.style.cssText = 'display: flex; justify-content: space-between; align-items: center; padding: 10px 15px; border-bottom: 1px solid #eee;';

            const fileInfo = document.createElement('div');
            fileInfo.style.cssText = 'flex: 1;';

            const fileName = document.createElement('div');
            fileName.textContent = file.name;
            fileName.style.cssText = 'font-weight: 500; margin-bottom: 5px; word-break: break-all;';

            const fileSize = document.createElement('div');
            fileSize.textContent = formatFileSize(file.size);
            fileSize.style.cssText = 'font-size: 12px; color: #7f8c8d;';

            fileInfo.appendChild(fileName);
            fileInfo.appendChild(fileSize);

            const downloadBtn = document.createElement('a');
            downloadBtn.textContent = '下载';
            downloadBtn.href = file.download_url;
            downloadBtn.style.cssText = 'padding: 6px 12px; background: #3498db; color: white; text-decoration: none; border-radius: 4px; font-size: 12px; white-space: nowrap;';

            item.appendChild(fileInfo);
            item.appendChild(downloadBtn);
            list.appendChild(item);
        });
    }

    // 关闭按钮
    const closeBtn = document.createElement('button');
    closeBtn.textContent = '关闭';
    closeBtn.style.cssText = 'padding: 8px 16px; background: #95a5a6; color: white; border: none; border-radius: 4px; cursor: pointer; align-self: flex-end;';
    closeBtn.onclick = () => document.body.removeChild(modal);

    content.appendChild(title);
    content.appendChild(pathInfo);
    content.appendChild(list);
    content.appendChild(closeBtn);
    modal.appendChild(content);
    document.body.appendChild(modal);

    // 点击背景关闭
    modal.onclick = (e) => {
        if (e.target === modal) {
            document.body.removeChild(modal);
        }
    };
}

/**
 * 格式化文件大小
 */
function formatFileSize(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
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

    // 清空之前的解析结果，避免误导
    clearPreviousResult();

    // 隐藏之前的下载链接（Docker 环境）
    hideDownloadLink();

    try {
        // 显示加载状态
        showLoading('正在解析视频信息…');
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
        // 清空按钮由 input 事件监听器控制，只要 URL 不为空就会显示

        // 如果当前是自定义模式，显示自定义选择区域
        const mode = document.querySelector('input[name="downloadMode"]:checked').value;
        if (mode === 'custom') {
            document.getElementById('customSelection').style.display = 'block';
        }

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
        // 清空旧结果，但保留错误消息显示
        clearPreviousResultKeepError();
        // 显示错误消息
        showError('解析失败: ' + error.message);
        console.error('解析URL时出错:', error);
    } finally {
        hideLoading();
        document.getElementById('parseBtn').disabled = false;
    }
}

/**
 * 清空之前的解析结果（保留错误消息）
 */
function clearPreviousResultKeepError() {
    // 隐藏视频信息区域
    document.getElementById('videoInfo').classList.remove('show');
    
    // 清空格式表格
    document.getElementById('formatsTableBody').innerHTML = '';
    
    // 禁用下载按钮
    document.getElementById('downloadBtn').disabled = true;
    
    // 重置当前格式数据
    currentFormats = null;
    
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
    
    // 隐藏自定义选择区域
    document.getElementById('customSelection').style.display = 'none';

    // 重置下载模式为默认（自定义选择）
    document.getElementById('modeCustom').checked = true;
    // 注意：不隐藏错误消息
}

/**
 * 清空之前的解析结果（包括错误消息）
 */
function clearPreviousResult() {
    clearPreviousResultKeepError();
    // 隐藏错误消息
    document.getElementById('errorMessage').classList.remove('show');
}

/**
 * 显示视频基本信息
 */
function displayVideoInfo(data) {
    document.getElementById('videoTitle').textContent = data.title || '未知标题';
    
    // 格式化时长为 HH:MM:SS.xxx
    if (data.duration) {
        const totalSeconds = Math.floor(data.duration);
        const milliseconds = Math.round((data.duration - totalSeconds) * 1000);
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;
        document.getElementById('duration').textContent = 
            `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(3, '0')}`;
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

        // 隐藏之前的下载链接（Docker 环境）
        hideDownloadLink();

        // 显示加载状态
        showLoading('正在准备下载…');

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
        updateStatus('下载任务已开始，请等待…', false);

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
 * 浏览选择文件夹（本地）/ 显示提示（Docker）
 */
async function browseFolder() {
    try {
        const response = await fetch('/api/select-folder', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            }
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || '选择文件夹失败');
        }

        if (data.success && data.path) {
            document.getElementById('outputPath').value = data.path;
            // Docker 环境：显示提示信息
            if (data.is_docker) {
                updateStatus('Docker 环境使用固定下载路径: ' + data.path, false);
                setTimeout(() => {
                    document.getElementById('statusMessage').classList.remove('show');
                }, 3000);
            }
        }
        // 如果用户取消选择，不做任何操作，保持原路径
    } catch (error) {
        showError('选择文件夹失败: ' + error.message);
        console.error('选择文件夹时出错:', error);
    }
}

/**
 * 设置常用文件夹快捷路径（本地）/ 显示提示（Docker）
 */
async function setQuickFolder(folderType) {
    try {
        const response = await fetch('/api/quick-folder', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ folder_type: folderType })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || '获取文件夹路径失败');
        }

        if (data.success && data.path) {
            document.getElementById('outputPath').value = data.path;
            // Docker 环境：显示提示信息
            if (data.is_docker) {
                updateStatus('Docker 环境使用固定下载路径', false);
                setTimeout(() => {
                    document.getElementById('statusMessage').classList.remove('show');
                }, 3000);
            }
        }
    } catch (error) {
        showError('设置文件夹失败: ' + error.message);
        console.error('设置快捷文件夹时出错:', error);
    }
}

/**
 * 收集下载参数
 */
function collectDownloadParams() {
    const mode = document.querySelector('input[name="downloadMode"]:checked').value;
    const filename = document.getElementById('filename').value.trim();
    const containerFormat = document.getElementById('containerFormat').value;
    const outputPath = document.getElementById('outputPath').value.trim();
    
    const params = {
        url: document.getElementById('urlInput').value.trim(),
        mode: mode,
        filename: filename || null,
        container: containerFormat || null,
        output_path: outputPath || null
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
                    // Docker 环境不显示状态消息，只显示下载链接
                    updateStatus(window.isDocker ? '' : '下载完成！', !window.isDocker);

                    // Docker 环境：显示下载链接
                    if (data.download_url && data.filename) {
                        showDownloadLink(data.download_url, data.filename);
                    }

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
    const clearBtn = document.getElementById('clearBtn');
    
    // 监听输入框内容变化，控制清空按钮显示
    urlInput.addEventListener('input', function() {
        if (this.value.trim()) {
            clearBtn.style.display = 'inline-block';
        } else {
            clearBtn.style.display = 'none';
        }
    });
    
    // 初始检查
    if (urlInput.value.trim()) {
        clearBtn.style.display = 'inline-block';
    }
    
    urlInput.addEventListener('keydown', function(event) {
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
    document.getElementById('clearBtn').style.display = 'none';

    // 使用 clearPreviousResult 清空所有结果
    clearPreviousResult();

    // 显示自定义选择区域（因为现在默认是自定义模式）
    document.getElementById('customSelection').style.display = 'block';

    // 清空进度和状态
    updateProgress(0, '');
    document.getElementById('progressContainer').classList.remove('show');
    document.getElementById('statusMessage').classList.remove('show');
}