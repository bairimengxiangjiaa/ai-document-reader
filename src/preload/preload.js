const { contextBridge, ipcRenderer } = require('electron');

/**
 * 预加载脚本
 * 通过 contextBridge 向渲染进程暴露安全的 API,避免直接暴露 Node.js 能力
 */
contextBridge.exposeInMainWorld('electronAPI', {
  // 文件操作
  openFiles: () => ipcRenderer.invoke('open-files'),
  openFolder: () => ipcRenderer.invoke('open-folder'),
  readFile: (filePath) => ipcRenderer.invoke('read-file', filePath),

  // AI 问答
  askLLM: (params) => ipcRenderer.invoke('ask-llm', params),
  summarize: (params) => ipcRenderer.invoke('summarize', params),

  // 模型配置
  getConfig: () => ipcRenderer.invoke('get-config'),
  saveConfig: (config) => ipcRenderer.invoke('save-config', config)
});
