const { app, BrowserWindow, dialog, ipcMain } = require('electron');
const path = require('path');
require('dotenv').config();

const { readFile, listSupportedFiles } = require('./file-handler');
const { ContextStore } = require('./context-store');
const { LLMClient } = require('./llm-client');

let mainWindow;

// 初始化上下文存储与 LLM 客户端
const contextStore = new ContextStore();
const llmClient = new LLMClient();

/**
 * 创建主窗口
 */
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 900,
    minHeight: 600,
    title: 'AI 文档阅读器',
    webPreferences: {
      preload: path.join(__dirname, '../preload/preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      // 允许在渲染进程中使用 fetch(默认已开启)
      sandbox: false
    }
  });

  mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));

  // 生产环境可取消下方注释以禁用开发者工具
  // mainWindow.webContents.openDevTools();
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// ==================== IPC 通信处理 ====================

/**
 * 打开文件对话框,选择多个本地文档
 */
ipcMain.handle('open-files', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile', 'multiSelections'],
    filters: [
      { name: '支持的文档', extensions: ['pdf', 'docx', 'txt', 'md'] },
      { name: '所有文件', extensions: ['*'] }
    ]
  });
  return result.canceled ? [] : result.filePaths;
});

/**
 * 打开文件夹对话框,扫描其中支持的文档
 */
ipcMain.handle('open-folder', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory']
  });
  if (result.canceled || !result.filePaths.length) return [];
  return listSupportedFiles(result.filePaths[0]);
});

/**
 * 读取并解析指定文件,同时更新上下文中的文档全文
 */
ipcMain.handle('read-file', async (event, filePath) => {
  const fileData = await readFile(filePath);
  contextStore.setDocumentText(filePath, fileData.text);
  return fileData;
});

/**
 * 基于当前文档进行 LLM 问答
 */
ipcMain.handle('ask-llm', async (event, { filePath, question, selectedText }) => {
  contextStore.addUserMessage(filePath, question);
  const messages = contextStore.buildMessages(
    filePath,
    question,
    selectedText || '',
    llmClient.maxContextLength
  );
  const answer = await llmClient.chat(messages);
  contextStore.addAssistantMessage(filePath, answer);
  return answer;
});

/**
 * 手动总结当前文档
 */
ipcMain.handle('summarize', async (event, { filePath }) => {
  const question = '请对这篇文档进行简明扼要的总结,列出核心要点。';
  contextStore.addUserMessage(filePath, question);
  const messages = contextStore.buildMessages(
    filePath,
    question,
    '',
    llmClient.maxContextLength
  );
  const answer = await llmClient.chat(messages);
  contextStore.addAssistantMessage(filePath, answer);
  return answer;
});

/**
 * 获取当前 LLM 配置
 */
ipcMain.handle('get-config', () => {
  return llmClient.getConfig();
});

/**
 * 保存 LLM 配置
 */
ipcMain.handle('save-config', (event, config) => {
  llmClient.updateConfig(config);
  return true;
});
