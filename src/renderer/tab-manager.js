/**
 * 多标签页状态管理模块
 * 不依赖 DOM,可在 Node 环境测试
 */

class TabManager {
  constructor() {
    this.tabs = [];
    this.activeTabId = null;
    this.idCounter = 0;
  }

  /**
   * 生成唯一 Tab ID
   * @returns {string}
   */
  generateTabId() {
    this.idCounter += 1;
    return `tab-${Date.now()}-${this.idCounter}`;
  }

  /**
   * 打开新标签页
   * @param {string} filePath
   * @param {Object} fileData
   * @returns {Object} 新建的 tab
   */
  openTab(filePath, fileData) {
    const tab = {
      id: this.generateTabId(),
      filePath,
      fileName: fileData.name,
      fileData
    };
    this.tabs.push(tab);
    this.activeTabId = tab.id;
    return tab;
  }

  /**
   * 切换到指定标签页
   * @param {string} tabId
   * @returns {Object|null}
   */
  switchTab(tabId) {
    const tab = this.tabs.find((t) => t.id === tabId);
    if (!tab) return null;
    this.activeTabId = tabId;
    return tab;
  }

  /**
   * 关闭指定标签页
   * @param {string} tabId
   * @returns {Object} { closed: boolean, newActiveTabId: string|null }
   */
  closeTab(tabId) {
    const tabIndex = this.tabs.findIndex((t) => t.id === tabId);
    if (tabIndex === -1) {
      return { closed: false, newActiveTabId: this.activeTabId };
    }

    this.tabs.splice(tabIndex, 1);

    let newActiveTabId = this.activeTabId;

    if (this.activeTabId === tabId) {
      if (this.tabs.length) {
        const newIndex = Math.min(tabIndex, this.tabs.length - 1);
        newActiveTabId = this.tabs[newIndex].id;
      } else {
        newActiveTabId = null;
      }
      this.activeTabId = newActiveTabId;
    }

    return { closed: true, newActiveTabId };
  }

  /**
   * 根据文件路径查找已打开的 Tab
   * @param {string} filePath
   * @returns {Object|null}
   */
  findTabByFilePath(filePath) {
    return this.tabs.find((t) => t.filePath === filePath) || null;
  }

  /**
   * 获取当前激活的 Tab
   * @returns {Object|null}
   */
  getActiveTab() {
    return this.tabs.find((t) => t.id === this.activeTabId) || null;
  }

  /**
   * 获取所有 Tab
   * @returns {Object[]}
   */
  getTabs() {
    return this.tabs;
  }

  /**
   * 清空所有 Tab
   */
  clear() {
    this.tabs = [];
    this.activeTabId = null;
  }
}

module.exports = { TabManager };
