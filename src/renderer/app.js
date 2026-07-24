/**
 * 渲染进程主逻辑
 * 负责界面交互、文件列表、文档渲染、划词监听、AI 聊天
 */

// ==================== 状态管理 ====================
const state = {
  files: [],           // 当前文件列表
  currentFile: null,   // 当前打开的文档路径
  selectedText: '',    // 当前划选的文本
  isAsking: false      // 是否正在请求 AI
};

// ==================== DOM 元素 ====================
const elements = {
  fileList: document.getElementById('file-list'),
  documentContent: document.getElementById('document-content'),
  currentFileName: document.getElementById('current-file-name'),
  selectionFloatBtn: document.getElementById('selection-float-btn'),
  chatMessages: document.getElementById('chat-messages'),
  chatInput: document.getElementById('chat-input'),
  btnSend: document.getElementById('btn-send'),
  btnSummarize: document.getElementById('btn-summarize'),
  btnClearChat: document.getElementById('btn-clear-chat'),
  btnOpenFiles: document.getElementById('btn-open-files'),
  btnOpenFolder: document.getElementById('btn-open-folder'),
  btnConfig: document.getElementById('btn-config'),
  configModal: document.getElementById('config-modal'),
  btnCloseConfig: document.getElementById('btn-close-config'),
  btnSaveConfig: document.getElementById('btn-save-config'),
  configBaseUrl: document.getElementById('config-base-url'),
  configApiKey: document.getElementById('config-api-key'),
  configModel: document.getElementById('config-model'),
  configMaxLength: document.getElementById('config-max-length')
};

// ==================== 初始化 ====================
document.addEventListener('DOMContentLoaded', () => {
  bindEvents();
  loadConfig();
});

/**
 * 绑定所有事件
 */
function bindEvents() {
  // 文件操作
  elements.btnOpenFiles.addEventListener('click', handleOpenFiles);
  elements.btnOpenFolder.addEventListener('click', handleOpenFolder);

  // AI 操作
  elements.btnSend.addEventListener('click', handleSendQuestion);
  elements.chatInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendQuestion();
    }
  });
  elements.btnSummarize.addEventListener('click', handleSummarize);
  elements.btnClearChat.addEventListener('click', handleClearChat);

  // 配置弹窗
  elements.btnConfig.addEventListener('click', openConfigModal);
  elements.btnCloseConfig.addEventListener('click', closeConfigModal);
  elements.btnSaveConfig.addEventListener('click', handleSaveConfig);
  elements.configModal.addEventListener('click', (e) => {
    if (e.target === elements.configModal) closeConfigModal();
  });

  // 划词监听
  document.addEventListener('mouseup', handleTextSelection);
  document.addEventListener('selectionchange', hideSelectionButton);
  elements.selectionFloatBtn.addEventListener('click', handleSelectionAsk);
}

// ==================== 文件操作 ====================

/**
 * 打开文件对话框
 */
async function handleOpenFiles() {
  try {
    const filePaths = await window.electronAPI.openFiles();
    addFiles(filePaths);
  } catch (error) {
    showError(`打开文件失败: ${error.message}`);
  }
}

/**
 * 打开文件夹对话框
 */
async function handleOpenFolder() {
  try {
    const files = await window.electronAPI.openFolder();
    addFiles(files.map((f) => f.path));
  } catch (error) {
    showError(`打开文件夹失败: ${error.message}`);
  }
}

/**
 * 添加文件到列表
 * @param {string[]} filePaths
 */
function addFiles(filePaths) {
  if (!filePaths || !filePaths.length) return;

  const newFiles = filePaths.filter((path) => !state.files.includes(path));
  state.files = state.files.concat(newFiles);
  renderFileList();

  // 如果当前没有打开文件,自动打开第一个新文件
  if (!state.currentFile && newFiles.length) {
    openFile(newFiles[0]);
  }
}

/**
 * 渲染文件列表
 */
function renderFileList() {
  elements.fileList.innerHTML = '';

  state.files.forEach((filePath) => {
    const li = document.createElement('li');
    li.className = `file-item ${filePath === state.currentFile ? 'active' : ''}`;
    li.title = filePath;
    li.innerHTML = `
      <span class="file-icon">${getFileIcon(filePath)}</span>
      <span class="file-name">${getFileName(filePath)}</span>
    `;
    li.addEventListener('click', () => openFile(filePath));
    elements.fileList.appendChild(li);
  });
}

/**
 * 获取文件图标
 * @param {string} filePath
 * @returns {string}
 */
function getFileIcon(filePath) {
  const ext = filePath.split('.').pop().toLowerCase();
  switch (ext) {
    case 'pdf': return '📄';
    case 'docx': return '📝';
    case 'txt': return '📃';
    case 'md': return '📘';
    default: return '📎';
  }
}

/**
 * 获取文件名
 * @param {string} filePath
 * @returns {string}
 */
function getFileName(filePath) {
  return filePath.split(/[\\/]/).pop();
}

/**
 * 打开并渲染指定文档
 * @param {string} filePath
 */
async function openFile(filePath) {
  try {
    const fileData = await window.electronAPI.readFile(filePath);
    state.currentFile = filePath;
    state.selectedText = '';
    hideSelectionButton();

    elements.currentFileName.textContent = fileData.name;
    renderDocument(fileData.text);
    renderFileList();
    enableChat();
    clearChatMessages();
    addWelcomeMessage();
  } catch (error) {
    showError(`读取文件失败: ${error.message}`);
  }
}

/**
 * 渲染文档内容
 * @param {string} text
 */
function renderDocument(text) {
  if (!text) {
    elements.documentContent.innerHTML = '<div class="empty-state"><p>文档内容为空</p></div>';
    return;
  }

  // 按段落拆分并渲染为 HTML
  const paragraphs = text.split('\n').filter((line) => line.trim());
  const html = paragraphs
    .map((line) => `<p>${escapeHtml(line)}</p>`)
    .join('');
  elements.documentContent.innerHTML = html;
}

/**
 * HTML 转义,防止文档内容中的特殊字符破坏页面
 * @param {string} text
 * @returns {string}
 */
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// ==================== 划词问答 ====================

/**
 * 处理文本选择,显示"问 AI"浮动按钮
 */
function handleTextSelection() {
  const selection = window.getSelection();
  const text = selection.toString().trim();

  if (!text || !state.currentFile) {
    hideSelectionButton();
    return;
  }

  state.selectedText = text;

  const range = selection.getRangeAt(0);
  const rect = range.getBoundingClientRect();

  // 将按钮显示在选区下方居中位置
  const btnWidth = 60;
  const left = rect.left + rect.width / 2 - btnWidth / 2;
  const top = rect.bottom + 8;

  elements.selectionFloatBtn.style.left = `${Math.max(8, left)}px`;
  elements.selectionFloatBtn.style.top = `${top}px`;
  elements.selectionFloatBtn.classList.remove('hidden');
}

/**
 * 隐藏划词浮动按钮
 */
function hideSelectionButton() {
  elements.selectionFloatBtn.classList.add('hidden');
}

/**
 * 点击"问 AI"按钮,将选中文本填入输入框
 */
function handleSelectionAsk() {
  if (!state.selectedText) return;

  elements.chatInput.value = `解释一下这段话:"${state.selectedText}"`;
  elements.chatInput.focus();
  hideSelectionButton();

  // 清空选区
  window.getSelection().removeAllRanges();
}

// ==================== AI 聊天 ====================

/**
 * 启用聊天输入
 */
function enableChat() {
  elements.chatInput.disabled = false;
  elements.btnSend.disabled = false;
  elements.btnSummarize.disabled = false;
  elements.btnClearChat.disabled = false;
}

/**
 * 发送问题
 */
async function handleSendQuestion() {
  if (state.isAsking || !state.currentFile) return;

  const question = elements.chatInput.value.trim();
  if (!question) return;

  const selectedText = state.selectedText;
  state.selectedText = '';

  addMessage('user', question);
  elements.chatInput.value = '';
  state.isAsking = true;
  setLoading(true);

  try {
    const answer = await window.electronAPI.askLLM({
      filePath: state.currentFile,
      question,
      selectedText
    });
    addMessage('assistant', answer);
  } catch (error) {
    addMessage('assistant', `❌ 请求失败: ${error.message}`);
  } finally {
    state.isAsking = false;
    setLoading(false);
  }
}

/**
 * 总结全文
 */
async function handleSummarize() {
  if (state.isAsking || !state.currentFile) return;

  addMessage('user', '请总结这篇文档的核心要点。');
  state.isAsking = true;
  setLoading(true);

  try {
    const answer = await window.electronAPI.summarize({
      filePath: state.currentFile
    });
    addMessage('assistant', answer);
  } catch (error) {
    addMessage('assistant', `❌ 总结失败: ${error.message}`);
  } finally {
    state.isAsking = false;
    setLoading(false);
  }
}

/**
 * 添加消息到聊天面板
 * @param {'user'|'assistant'} role
 * @param {string} content
 */
function addMessage(role, content) {
  // 首次发送时移除欢迎语
  const welcome = elements.chatMessages.querySelector('.chat-welcome');
  if (welcome) welcome.remove();

  const messageDiv = document.createElement('div');
  messageDiv.className = `message message-${role}`;
  messageDiv.innerHTML = `
    <span class="message-role">${role === 'user' ? '你' : 'AI'}</span>
    <div class="message-bubble">${escapeHtml(content)}</div>
  `;
  elements.chatMessages.appendChild(messageDiv);
  scrollToBottom();
}

/**
 * 添加欢迎语
 */
function addWelcomeMessage() {
  elements.chatMessages.innerHTML = `
    <div class="chat-welcome">
      <p>已加载文档,你可以:</p>
      <ul>
        <li>点击"总结全文"获取文档概要</li>
        <li>在文档中划选文字,点击"问 AI"</li>
        <li>在下方输入框直接提问</li>
      </ul>
    </div>
  `;
}

/**
 * 清空聊天记录
 */
function handleClearChat() {
  if (!state.currentFile) return;
  clearChatMessages();
  addWelcomeMessage();
}

/**
 * 清空聊天消息区
 */
function clearChatMessages() {
  elements.chatMessages.innerHTML = '';
}

/**
 * 滚动到聊天面板底部
 */
function scrollToBottom() {
  elements.chatMessages.scrollTop = elements.chatMessages.scrollHeight;
}

/**
 * 设置加载状态
 * @param {boolean} loading
 */
function setLoading(loading) {
  elements.btnSend.disabled = loading;
  elements.btnSummarize.disabled = loading;
  elements.chatInput.disabled = loading;

  if (loading) {
    const loadingDiv = document.createElement('div');
    loadingDiv.className = 'message message-assistant loading-message';
    loadingDiv.innerHTML = `
      <span class="message-role">AI</span>
      <div class="message-bubble">思考中...</div>
    `;
    loadingDiv.id = 'loading-message';
    elements.chatMessages.appendChild(loadingDiv);
    scrollToBottom();
  } else {
    const loadingMessage = document.getElementById('loading-message');
    if (loadingMessage) loadingMessage.remove();
  }
}

// ==================== 配置管理 ====================

/**
 * 加载并显示当前配置
 */
async function loadConfig() {
  try {
    const config = await window.electronAPI.getConfig();
    elements.configBaseUrl.value = config.baseUrl || '';
    elements.configModel.value = config.model || '';
    elements.configMaxLength.value = config.maxContextLength || '';
    // API Key 只显示掩码,不预填真实值
    elements.configApiKey.value = '';
  } catch (error) {
    console.error('加载配置失败:', error);
  }
}

/**
 * 打开配置弹窗
 */
function openConfigModal() {
  loadConfig();
  elements.configModal.classList.remove('hidden');
}

/**
 * 关闭配置弹窗
 */
function closeConfigModal() {
  elements.configModal.classList.add('hidden');
}

/**
 * 保存配置
 */
async function handleSaveConfig() {
  const config = {
    baseUrl: elements.configBaseUrl.value.trim(),
    model: elements.configModel.value.trim(),
    maxContextLength: parseInt(elements.configMaxLength.value, 10) || 8000
  };

  const apiKey = elements.configApiKey.value.trim();
  if (apiKey) {
    config.apiKey = apiKey;
  }

  try {
    await window.electronAPI.saveConfig(config);
    closeConfigModal();
  } catch (error) {
    showError(`保存配置失败: ${error.message}`);
  }
}

// ==================== 错误提示 ====================

/**
 * 显示错误信息
 * @param {string} message
 */
function showError(message) {
  alert(message);
}
