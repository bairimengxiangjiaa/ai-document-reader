require('dotenv').config();
const fetch = require('node-fetch');

/**
 * LLM 客户端
 * 通过 OpenAI 兼容接口调用大模型服务,支持智谱、DeepSeek、通义千问等
 */
class LLMClient {
  /**
   * @param {Object} config 配置对象
   * @param {string} config.baseUrl API 基础地址
   * @param {string} config.apiKey API Key
   * @param {string} config.model 模型名称
   * @param {number} config.maxContextLength 最大上下文长度
   */
  constructor(config = {}) {
    this.baseUrl = (config.baseUrl || process.env.LLM_BASE_URL || '').replace(/\/$/, '');
    this.apiKey = config.apiKey || process.env.LLM_API_KEY || '';
    this.model = config.model || process.env.LLM_MODEL || 'glm-4-flash';
    this.maxContextLength = parseInt(config.maxContextLength || process.env.LLM_MAX_CONTEXT_LENGTH || '8000', 10);
  }

  /**
   * 更新配置
   * @param {Object} config
   */
  updateConfig(config) {
    if (config.baseUrl) this.baseUrl = config.baseUrl.replace(/\/$/, '');
    if (config.apiKey) this.apiKey = config.apiKey;
    if (config.model) this.model = config.model;
    if (config.maxContextLength) this.maxContextLength = parseInt(config.maxContextLength, 10);
  }

  /**
   * 校验配置是否完整
   */
  validate() {
    if (!this.baseUrl) {
      throw new Error('缺少 LLM Base URL,请在配置面板或 .env 文件中设置');
    }
    if (!this.apiKey) {
      throw new Error('缺少 LLM API Key,请在配置面板或 .env 文件中设置');
    }
  }

  /**
   * 发送聊天请求
   * @param {Array<{role: string, content: string}>} messages 消息数组
   * @returns {Promise<string>} 助手回复内容
   */
  async chat(messages) {
    this.validate();

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      },
      body: JSON.stringify({
        model: this.model,
        messages,
        temperature: 0.7
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`LLM 请求失败 (${response.status}): ${errorText}`);
    }

    const data = await response.json();

    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      throw new Error('LLM 返回格式异常');
    }

    return data.choices[0].message.content;
  }

  /**
   * 获取当前配置(隐藏 API Key 完整内容)
   * @returns {Object}
   */
  getConfig() {
    return {
      baseUrl: this.baseUrl,
      apiKey: this.apiKey ? `${this.apiKey.slice(0, 4)}...${this.apiKey.slice(-4)}` : '',
      model: this.model,
      maxContextLength: this.maxContextLength
    };
  }
}

module.exports = { LLMClient };
