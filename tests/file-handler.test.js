const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { readFile, listSupportedFiles, isSupported } = require('../src/main/file-handler');

console.log('运行 file-handler 测试...\n');

(async function runTests() {
  // 创建临时测试目录
  const testDir = path.join(__dirname, 'fixtures');
  const txtPath = path.join(testDir, 'sample.txt');
  const unsupportedPath = path.join(testDir, 'sample.exe');

  if (!fs.existsSync(testDir)) {
    fs.mkdirSync(testDir, { recursive: true });
  }

  // 准备测试文件
  fs.writeFileSync(txtPath, '这是第一段。\r\n\r\n\r\n这是第二段。', 'utf-8');
  fs.writeFileSync(unsupportedPath, 'binary content', 'utf-8');

  // 测试 1: 判断文件格式支持
  {
    assert.strictEqual(isSupported('/docs/test.pdf'), true);
    assert.strictEqual(isSupported('/docs/test.docx'), true);
    assert.strictEqual(isSupported('/docs/test.txt'), true);
    assert.strictEqual(isSupported('/docs/test.exe'), false);
    console.log('✓ 文件格式判断成功');
  }

  // 测试 2: 读取 TXT 文件并清理多余空行
  {
    const result = await readFile(txtPath);
    assert.strictEqual(result.name, 'sample.txt');
    assert.strictEqual(result.ext, '.txt');
    assert.ok(result.text.includes('这是第一段。'));
    assert.ok(result.text.includes('这是第二段。'));
    assert.ok(!result.text.includes('\n\n\n'));
    console.log('✓ 读取 TXT 文件成功');
  }

  // 测试 3: 文件不存在时抛出错误
  {
    let errorThrown = false;
    try {
      await readFile('/path/not/exist.pdf');
    } catch (error) {
      errorThrown = true;
      assert.ok(error.message.includes('文件不存在'));
    }
    assert.strictEqual(errorThrown, true);
    console.log('✓ 文件不存在错误处理成功');
  }

  // 测试 4: 不支持的文件格式抛出错误
  {
    let errorThrown = false;
    try {
      await readFile(unsupportedPath);
    } catch (error) {
      errorThrown = true;
      assert.ok(error.message.includes('不支持的文件格式'));
    }
    assert.strictEqual(errorThrown, true);
    console.log('✓ 不支持格式错误处理成功');
  }

  // 测试 5: 扫描文件夹
  {
    const files = listSupportedFiles(testDir);
    assert.strictEqual(files.length, 1);
    assert.strictEqual(files[0].name, 'sample.txt');
    console.log('✓ 扫描文件夹成功');
  }

  // 清理临时文件
  fs.unlinkSync(txtPath);
  fs.unlinkSync(unsupportedPath);
  fs.rmdirSync(testDir);

  console.log('\nfile-handler 所有测试通过 ✓');
})();
