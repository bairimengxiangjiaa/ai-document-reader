const fs = require('fs');
const path = require('path');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');

// 支持的文件扩展名列表
const SUPPORTED_EXTENSIONS = ['.pdf', '.docx', '.txt', '.md'];

/**
 * 判断文件是否受支持
 * @param {string} filePath 文件路径
 * @returns {boolean}
 */
function isSupported(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return SUPPORTED_EXTENSIONS.includes(ext);
}

/**
 * 读取并解析文件内容为纯文本
 * @param {string} filePath 文件路径
 * @returns {Promise<{name: string, path: string, text: string, ext: string}>}
 */
async function readFile(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`文件不存在: ${filePath}`);
  }

  if (!isSupported(filePath)) {
    throw new Error(`不支持的文件格式: ${path.extname(filePath)}`);
  }

  const ext = path.extname(filePath).toLowerCase();
  const name = path.basename(filePath);
  let text = '';

  try {
    if (ext === '.pdf') {
      // 读取 PDF 文件并提取文字
      const buffer = fs.readFileSync(filePath);
      const data = await pdfParse(buffer);
      text = data.text || '';
    } else if (ext === '.docx') {
      // 读取 Word 文档并提取纯文本
      const result = await mammoth.extractRawText({ path: filePath });
      text = result.value || '';
    } else if (ext === '.txt' || ext === '.md') {
      // 文本文件直接按 UTF-8 读取
      text = fs.readFileSync(filePath, 'utf-8');
    }
  } catch (error) {
    throw new Error(`解析文件失败: ${error.message}`);
  }

  // 清理文本:统一换行符并移除多余空行
  text = text.replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();

  return {
    name,
    path: filePath,
    ext,
    text
  };
}

/**
 * 扫描文件夹,返回所有支持的文件列表
 * @param {string} folderPath 文件夹路径
 * @returns {Array<{name: string, path: string, ext: string}>}
 */
function listSupportedFiles(folderPath) {
  if (!fs.existsSync(folderPath) || !fs.statSync(folderPath).isDirectory()) {
    throw new Error(`文件夹不存在: ${folderPath}`);
  }

  const files = fs.readdirSync(folderPath);
  return files
    .map((name) => ({
      name,
      path: path.join(folderPath, name),
      ext: path.extname(name).toLowerCase()
    }))
    .filter((file) => SUPPORTED_EXTENSIONS.includes(file.ext));
}

module.exports = {
  SUPPORTED_EXTENSIONS,
  isSupported,
  readFile,
  listSupportedFiles
};
