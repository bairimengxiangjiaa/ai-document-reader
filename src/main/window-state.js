/**
 * 窗口状态持久化模块
 * 使用 electron-store 记住窗口大小、位置和最大化状态
 */

const Store = require('electron-store');

// 创建专用 store,名称 window-state
const store = new Store({ name: 'window-state' });

// 默认窗口状态
const DEFAULT_STATE = {
  width: 1280,
  height: 800,
  x: undefined,
  y: undefined,
  maximized: false
};

/**
 * 获取保存的窗口状态
 * @returns {Object}
 */
function getWindowState() {
  return store.get('window', DEFAULT_STATE);
}

/**
 * 保存当前窗口状态
 * @param {Electron.BrowserWindow} mainWindow
 */
function saveWindowState(mainWindow) {
  if (!mainWindow || mainWindow.isDestroyed()) return;

  const maximized = mainWindow.isMaximized();

  // 最大化时不保存 bounds,使用上次非最大化状态
  if (maximized) {
    store.set('window', {
      ...getWindowState(),
      maximized: true
    });
    return;
  }

  const bounds = mainWindow.getBounds();
  store.set('window', {
    width: bounds.width,
    height: bounds.height,
    x: bounds.x,
    y: bounds.y,
    maximized: false
  });
}

/**
 * 创建窗口时使用保存的状态
 * @returns {Object}
 */
function getBrowserWindowOptions() {
  const state = getWindowState();
  return {
    width: state.width,
    height: state.height,
    x: state.x,
    y: state.y,
    maximized: state.maximized,
    show: false,
    webPreferences: {
      preload: require('path').join(__dirname, '../preload/preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  };
}

module.exports = {
  getWindowState,
  saveWindowState,
  getBrowserWindowOptions
};
