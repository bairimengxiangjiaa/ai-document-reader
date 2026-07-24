const assert = require('assert');
const { ContextStore } = require('../src/main/context-store');

console.log('运行 context-store 测试...\n');

// 测试 1: 获取上下文
{
  const store = new ContextStore();
  const ctx = store.getContext('/docs/test.pdf');
  assert.strictEqual(ctx.documentPath, '/docs/test.pdf');
  assert.strictEqual(ctx.documentText, '');
  assert.deepStrictEqual(ctx.messages, []);
  console.log('✓ 获取上下文成功');
}

// 测试 2: 设置文档全文
{
  const store = new ContextStore();
  store.setDocumentText('/docs/test.pdf', '这是一篇测试文档。');
  const ctx = store.getContext('/docs/test.pdf');
  assert.strictEqual(ctx.documentText, '这是一篇测试文档。');
  console.log('✓ 设置文档全文成功');
}

// 测试 3: 添加消息
{
  const store = new ContextStore();
  store.addUserMessage('/docs/test.pdf', '什么是测试?');
  store.addAssistantMessage('/docs/test.pdf', '测试是验证行为。');
  const messages = store.getMessages('/docs/test.pdf');
  assert.strictEqual(messages.length, 2);
  assert.strictEqual(messages[0].role, 'user');
  assert.strictEqual(messages[1].role, 'assistant');
  console.log('✓ 添加消息成功');
}

// 测试 4: 构建完整消息
{
  const store = new ContextStore();
  store.setDocumentText('/docs/test.pdf', '文档正文内容。');
  store.addUserMessage('/docs/test.pdf', '问题一');
  store.addAssistantMessage('/docs/test.pdf', '回答一');

  const messages = store.buildMessages('/docs/test.pdf', '问题二', '', 1000);

  assert.strictEqual(messages.length, 4);
  assert.strictEqual(messages[0].role, 'system');
  assert.ok(messages[0].content.includes('文档正文内容。'));
  assert.strictEqual(messages[3].content, '问题二');
  console.log('✓ 构建完整消息成功');
}

// 测试 5: 系统提示词截断
{
  const store = new ContextStore();
  const longText = '文'.repeat(10000);
  const prompt = store.buildSystemPrompt(longText, '', 1000);

  assert.ok(prompt.length <= 1000);
  assert.ok(prompt.includes('文档内容:'));
  console.log('✓ 系统提示词截断成功');
}

// 测试 6: 选中文本融入系统提示词
{
  const store = new ContextStore();
  const prompt = store.buildSystemPrompt('文档正文。', '选中文字', 1000);

  assert.ok(prompt.includes('文档正文。'));
  assert.ok(prompt.includes('用户当前选中的内容:'));
  assert.ok(prompt.includes('选中文字'));
  console.log('✓ 选中文本融入系统提示词成功');
}

// 测试 7: 清空消息
{
  const store = new ContextStore();
  store.addUserMessage('/docs/test.pdf', '问题');
  store.clearMessages('/docs/test.pdf');
  assert.deepStrictEqual(store.getMessages('/docs/test.pdf'), []);
  console.log('✓ 清空消息成功');
}

console.log('\ncontext-store 所有测试通过 ✓');
