/**
 * 上下文存储模块
 * 为每个打开的文档维护独立的对话历史与文档全文
 */

class ContextStore {
  constructor() {
    // 使用 Map 存储每个文档的上下文,key 为文件路径
    this.contexts = new Map();
  }

  /**
   * 获取或创建文档上下文
   * @param {string} documentPath 文档路径
   * @returns {{documentPath: string, documentText: string, messages: Array}}
   */
  getContext(documentPath) {
    if (!this.contexts.has(documentPath)) {
      this.contexts.set(documentPath, {
        documentPath,
        documentText: '',
        messages: []
      });
    }
    return this.contexts.get(documentPath);
  }

  /**
   * 设置文档全文
   * @param {string} documentPath 文档路径
   * @param {string} text 文档正文
   */
  setDocumentText(documentPath, text) {
    const ctx = this.getContext(documentPath);
    ctx.documentText = text;
  }

  /**
   * 添加用户消息到历史记录
   * @param {string} documentPath 文档路径
   * @param {string} content 消息内容
   */
  addUserMessage(documentPath, content) {
    const ctx = this.getContext(documentPath);
    ctx.messages.push({ role: 'user', content });
  }

  /**
   * 添加助手消息到历史记录
   * @param {string} documentPath 文档路径
   * @param {string} content 消息内容
   */
  addAssistantMessage(documentPath, content) {
    const ctx = this.getContext(documentPath);
    ctx.messages.push({ role: 'assistant', content });
  }

  /**
   * 清空某个文档的对话历史
   * @param {string} documentPath 文档路径
   */
  clearMessages(documentPath) {
    const ctx = this.getContext(documentPath);
    ctx.messages = [];
  }

  /**
   * 获取某文档的聊天记录
   * @param {string} documentPath 文档路径
   * @returns {Array}
   */
  getMessages(documentPath) {
    return this.getContext(documentPath).messages;
  }

  /**
   * 构建发送给 LLM 的完整消息数组
   * 包含系统提示(文档全文+选中文本)、历史对话和当前问题
   * @param {string} documentPath 文档路径
   * @param {string} currentQuestion 当前问题
   * @param {string} selectedText 用户选中的文本(可选)
   * @returns {Array<{role: string, content: string}>}
   */
  buildMessages(documentPath, currentQuestion, selectedText = '', maxLength = 6000) {
    const ctx = this.getContext(documentPath);
    const systemPrompt = this.buildSystemPrompt(ctx.documentText, selectedText, maxLength);

    return [
      { role: 'system', content: systemPrompt },
      ...ctx.messages,
      { role: 'user', content: currentQuestion }
    ];
  }

  /**
   * 根据最大上下文长度截断并构建系统提示词
   * @param {string} documentText 文档全文
   * @param {string} selectedText 用户选中的文本
   * @param {number} maxLength 最大字符数
   * @returns {string}
   */
  buildSystemPrompt(documentText, selectedText, maxLength = 6000) {
    // 保留系统提示词框架所需的固定字符数
    const frameworkLength = 100;
    let availableLength = maxLength - frameworkLength;

    // 如果有选中文本,优先保留选中文本,剩余空间给文档全文
    let selectedPart = '';
    if (selectedText) {
      const selectedHeader = '\n\n用户当前选中的内容:\n';
      const maxSelectedLength = Math.min(selectedText.length, Math.floor(availableLength * 0.3));
      selectedPart = selectedHeader + selectedText.slice(0, maxSelectedLength);
      availableLength -= selectedPart.length;
    }

    // 对文档正文进行尾部截断,保留前面的内容
    const docPart = documentText.slice(0, Math.max(0, availableLength));

    return `你是一个文档阅读助手。请基于以下文档内容回答问题。如果文档中没有相关信息,请明确说明。\n\n文档内容:\n${docPart}${selectedPart}`;
  }

  /**
   * 估算消息列表的总字符长度
   * @param {Array} messages 消息数组
   * @returns {number}
   */
  estimateLength(messages) {
    return messages.reduce((sum, msg) => sum + (msg.content ? msg.content.length : 0), 0);
  }
}

module.exports = { ContextStore };
