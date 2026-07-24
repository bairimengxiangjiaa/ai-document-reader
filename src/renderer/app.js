/**
 * 渲染进程主逻辑
 * 负责界面交互、文件列表、多标签页文档阅读、划词监听、AI 聊天
 */

// ==================== 状态管理 ====================
const state = {
  files: [],           // 左侧文件列表(路径数组)
  tabs: [],            // 已打开的标签页数组
  activeTabId: null,   // 当前激活的标签页 ID
  selectedText: '',    // 当前划选的文本
  isAsking: false      // 是否正在请求 AI
};

// ==================== DOM 元素 ====================
const elements = {
  fileSidebar: document.getElementById('file-sidebar'),
  fileList: document.getElementById('file-list'),
  tabList: document.getElementById('tab-list'),
  documentContent: document.getElementById('document-content'),
  selectionFloatBtn: document.getElementById('selection-float-btn'),
  chatPanel: document.getElementById('chat-panel'),
  chatMessages: document.getElementById('chat-messages'),
  chatInput: document.getElementById('chat-input'),
  btnSend: document.getElementById('btn-send'),
  btnSummarize: document.getElementById('btn-summarize'),
  btnClearChat: document.getElementById('btn-clear-chat'),
  btnOpenFiles: document.getElementById('btn-open-files'),
  btnOpenFolder: document.getElementById('btn-open-folder'),
  btnToggleSidebar: document.getElementById('btn-toggle-sidebar'),
  btnToggleChat: document.getElementById('btn-toggle-chat'),
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

  // 侧边栏折叠
  elements.btnToggleSidebar.addEventListener('click', toggleSidebar);
  elements.btnToggleChat.addEventListener('click', toggleChat);

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

  // 如果当前没有打开标签页,自动打开第一个新文件
  if (!state.activeTabId && newFiles.length) {
    openTab(newFiles[0]);
  }
}

/**
 * 渲染文件列表
 */
function renderFileList() {
  elements.fileList.innerHTML = '';

  state.files.forEach((filePath) => {
    const li = document.createElement('li');
    const isActive = state.tabs.some(
      (tab) => tab.filePath === filePath && tab.id === state.activeTabId
    );
    li.className = `file-item ${isActive ? 'active' : ''}`;
    li.title = filePath;
    li.innerHTML = `
      <span class="file-icon">${getFileIcon(filePath)}</span>
      <span class="file-name">${getFileName(filePath)}</span>
    `;
    li.addEventListener('click', () => openOrSwitchTab(filePath));
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
    case 'doc':
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

// ==================== 多标签页管理 ====================

/**
 * 点击文件列表:如果已有 Tab 则切换,否则新建 Tab
 * @param {string} filePath
 */
function openOrSwitchTab(filePath) {
  const existingTab = state.tabs.find((tab) => tab.filePath === filePath);
  if (existingTab) {
    switchTab(existingTab.id);
  } else {
    openTab(filePath);
  }
}

/**
 * 新建标签页并加载文档
 * @param {string} filePath
 */
async function openTab(filePath) {
  try {
    const fileData = await window.electronAPI.readFile(filePath);
    const tab = {
      id: generateTabId(),
      filePath,
      fileName: fileData.name,
      fileData
    };

    state.tabs.push(tab);
    state.activeTabId = tab.id;
    state.selectedText = '';
    hideSelectionButton();

    renderTabs();
    renderFileList();
    renderActiveDocument();
    await loadChatHistory(filePath);
    enableChat();
  } catch (error) {
    showError(`读取文件失败: ${error.message}`);
  }
}

/**
 * 切换到指定标签页
 * @param {string} tabId
 */
async function switchTab(tabId) {
  if (tabId === state.activeTabId) return;

  const tab = state.tabs.find((t) => t.id === tabId);
  if (!tab) return;

  state.activeTabId = tabId;
  state.selectedText = '';
  hideSelectionButton();

  renderTabs();
  renderFileList();
  renderActiveDocument();
  await loadChatHistory(tab.filePath);
  enableChat();
}

/**
 * 关闭指定标签页
 * @param {string} tabId
 */
async function closeTab(tabId, event) {
  if (event) {
    event.stopPropagation();
  }

  const tabIndex = state.tabs.findIndex((t) => t.id === tabId);
  if (tabIndex === -1) return;

  state.tabs.splice(tabIndex, 1);

  if (state.activeTabId === tabId) {
    if (state.tabs.length) {
      // 切换到相邻 Tab
      const newIndex = Math.min(tabIndex, state.tabs.length - 1);
      state.activeTabId = state.tabs[newIndex].id;
      renderActiveDocument();
      await loadChatHistory(state.tabs[newIndex].filePath);
      enableChat();
    } else {
      state.activeTabId = null;
      showEmptyDocument();
      disableChat();
    }
  }

  renderTabs();
  renderFileList();
}

/**
 * 生成唯一 Tab ID
 * @returns {string}
 */
function generateTabId() {
  return `tab-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * 渲染 Tab 栏
 */
function renderTabs() {
  elements.tabList.innerHTML = '';

  state.tabs.forEach((tab) => {
    const tabEl = document.createElement('div');
    tabEl.className = `tab-item ${tab.id === state.activeTabId ? 'active' : ''}`;
    tabEl.title = tab.filePath;
    tabEl.innerHTML = `
      <span class="tab-name">${escapeHtml(tab.fileName)}</span>
      <button class="tab-close" title="关闭">×</button>
    `;
    tabEl.addEventListener('click', () => switchTab(tab.id));

    const closeBtn = tabEl.querySelector('.tab-close');
    closeBtn.addEventListener('click', (e) => closeTab(tab.id, e));

    elements.tabList.appendChild(tabEl);
  });

  // 滚动到激活的 Tab
  const activeTab = elements.tabList.querySelector('.tab-item.active');
  if (activeTab) {
    activeTab.scrollIntoView({ behavior: 'smooth', inline: 'center' });
  }
}

/**
 * 渲染当前激活的文档内容
 */
function renderActiveDocument() {
  const tab = getActiveTab();
  if (!tab || !tab.fileData) {
    showEmptyDocument();
    return;
  }

  renderDocument(tab.fileData.text);
}

/**
 * 显示空状态
 */
function showEmptyDocument() {
  elements.documentContent.innerHTML = `
    <div class="empty-state">
      <p>请从左侧选择或打开一个文档</p>
    </div>
  `;
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
 * 获取当前激活的 Tab
 * @returns {Object|null}
 */
function getActiveTab() {
  return state.tabs.find((tab) => tab.id === state.activeTabId) || null;
}

// ==================== 划词问答 ====================

/**
 * 处理文本选择,显示"问 AI"浮动按钮
 */
function handleTextSelection() {
  const selection = window.getSelection();
  const text = selection.toString().trim();

  if (!text || !state.activeTabId) {
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
 * 禁用聊天输入
 */
function disableChat() {
  elements.chatInput.disabled = true;
  elements.btnSend.disabled = true;
  elements.btnSummarize.disabled = true;
  elements.btnClearChat.disabled = true;
  clearChatMessages();
  addWelcomeMessage();
}

/**
 * 加载当前文档的聊天历史
 * @param {string} filePath
 */
async function loadChatHistory(filePath) {
  clearChatMessages();

  try {
    const messages = await window.electronAPI.getMessages(filePath);
    if (!messages || !messages.length) {
      addWelcomeMessage();
      return;
    }

    messages.forEach((msg) => {
      const role = msg.role === 'user' ? 'user' : 'assistant';
      addMessage(role, msg.content);
    });
  } catch (error) {
    console.error('加载聊天历史失败:', error);
    addWelcomeMessage();
  }
}

/**
 * 发送问题
 */
async function handleSendQuestion() {
  if (state.isAsking || !state.activeTabId) return;

  const question = elements.chatInput.value.trim();
  if (!question) return;

  const tab = getActiveTab();
  if (!tab) return;

  const selectedText = state.selectedText;
  state.selectedText = '';

  addMessage('user', question);
  elements.chatInput.value = '';
  state.isAsking = true;
  setLoading(true);

  try {
    const answer = await window.electronAPI.askLLM({
      filePath: tab.filePath,
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
  if (state.isAsking || !state.activeTabId) return;

  const tab = getActiveTab();
  if (!tab) return;

  addMessage('user', '请总结这篇文档的核心要点。');
  state.isAsking = true;
  setLoading(true);

  try {
    const answer = await window.electronAPI.summarize({
      filePath: tab.filePath
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
  if (!state.activeTabId) return;

  const tab = getActiveTab();
  if (!tab) return;

  clearChatMessages();
  addWelcomeMessage();
  // 通知主进程清空该文档的历史消息
  window.electronAPI.getMessages(tab.filePath).then(() => {
    // getMessages 只是读取,真正清空需要新增 IPC;此处仅清空 UI
  });
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

// ==================== 侧边栏折叠 ====================

/**
 * 切换左侧文件列表侧边栏
 */
function toggleSidebar() {
  const isCollapsed = elements.fileSidebar.classList.toggle('collapsed');
  elements.btnToggleSidebar.textContent = isCollapsed ? '▶' : '◀';
  elements.btnToggleSidebar.title = isCollapsed ? '展开' : '折叠';
}

/**
 * 切换右侧 AI 聊天侧边栏
 */
function toggleChat() {
  const isCollapsed = elements.chatPanel.classList.toggle('collapsed');
  elements.btnToggleChat.textContent = isCollapsed ? '◀' : '▶';
  elements.btnToggleChat.title = isCollapsed ? '展开' : '折叠';
}

// ==================== 工具函数 ====================

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

/**
 * 显示错误信息
 * @param {string} message
 */
function showError(message) {
  alert(message);
}
