const assert = require('assert');
const { TabManager } = require('../src/renderer/tab-manager');

console.log('运行 tab-manager 测试...\n');

// 测试 1: 初始状态
{
  const manager = new TabManager();
  assert.deepStrictEqual(manager.getTabs(), []);
  assert.strictEqual(manager.getActiveTab(), null);
  console.log('✓ 初始状态正确');
}

// 测试 2: 打开标签页
{
  const manager = new TabManager();
  const tab = manager.openTab('/docs/test.pdf', { name: 'test.pdf', text: '内容' });

  assert.strictEqual(manager.getTabs().length, 1);
  assert.strictEqual(manager.getActiveTab().id, tab.id);
  assert.strictEqual(tab.fileName, 'test.pdf');
  console.log('✓ 打开标签页成功');
}

// 测试 3: 切换标签页
{
  const manager = new TabManager();
  const tab1 = manager.openTab('/docs/a.pdf', { name: 'a.pdf', text: 'A' });
  const tab2 = manager.openTab('/docs/b.pdf', { name: 'b.pdf', text: 'B' });

  assert.strictEqual(manager.getActiveTab().id, tab2.id);

  const switched = manager.switchTab(tab1.id);
  assert.strictEqual(switched.id, tab1.id);
  assert.strictEqual(manager.getActiveTab().id, tab1.id);
  console.log('✓ 切换标签页成功');
}

// 测试 4: 根据文件路径查找 Tab
{
  const manager = new TabManager();
  manager.openTab('/docs/a.pdf', { name: 'a.pdf', text: 'A' });

  const found = manager.findTabByFilePath('/docs/a.pdf');
  assert.strictEqual(found.fileName, 'a.pdf');

  const notFound = manager.findTabByFilePath('/docs/b.pdf');
  assert.strictEqual(notFound, null);
  console.log('✓ 根据文件路径查找 Tab 成功');
}

// 测试 5: 关闭非激活标签页
{
  const manager = new TabManager();
  const tab1 = manager.openTab('/docs/a.pdf', { name: 'a.pdf', text: 'A' });
  manager.openTab('/docs/b.pdf', { name: 'b.pdf', text: 'B' });

  const result = manager.closeTab(tab1.id);
  assert.strictEqual(result.closed, true);
  assert.strictEqual(manager.getTabs().length, 1);
  assert.strictEqual(manager.getActiveTab().fileName, 'b.pdf');
  console.log('✓ 关闭非激活标签页成功');
}

// 测试 6: 关闭激活标签页,自动切换到相邻标签页
{
  const manager = new TabManager();
  manager.openTab('/docs/a.pdf', { name: 'a.pdf', text: 'A' });
  const tab2 = manager.openTab('/docs/b.pdf', { name: 'b.pdf', text: 'B' });
  const tab3 = manager.openTab('/docs/c.pdf', { name: 'c.pdf', text: 'C' });

  manager.closeTab(tab3.id);

  assert.strictEqual(manager.getTabs().length, 2);
  assert.strictEqual(manager.getActiveTab().id, tab2.id);
  console.log('✓ 关闭激活标签页自动切换成功');
}

// 测试 7: 关闭最后一个标签页
{
  const manager = new TabManager();
  const tab = manager.openTab('/docs/a.pdf', { name: 'a.pdf', text: 'A' });

  const result = manager.closeTab(tab.id);
  assert.strictEqual(result.closed, true);
  assert.strictEqual(result.newActiveTabId, null);
  assert.strictEqual(manager.getActiveTab(), null);
  console.log('✓ 关闭最后一个标签页成功');
}

// 测试 8: 关闭不存在的标签页
{
  const manager = new TabManager();
  const tab = manager.openTab('/docs/a.pdf', { name: 'a.pdf', text: 'A' });

  const result = manager.closeTab('not-exist');
  assert.strictEqual(result.closed, false);
  assert.strictEqual(manager.getActiveTab().id, tab.id);
  console.log('✓ 关闭不存在标签页处理成功');
}

console.log('\ntab-manager 所有测试通过 ✓');
