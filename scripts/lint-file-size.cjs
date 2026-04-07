const fs = require('fs');
const path = require('path');

const MAX_LINES = 500;
const SRC_DIR = path.join(__dirname, '..', 'src');

const extensions = ['.ts', '.tsx'];
const excludePatterns = [
  //.test/.(ts|tsx)$/,
  //.spec/.(ts|tsx)$/,
  /__tests__/,
  /node_modules/,
  //.d/.ts$/,
];

function getFiles(dir, files = []) {
  const items = fs.readdirSync(dir);
  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      if (excludePatterns.some(pattern => pattern.test(item))) continue;
      getFiles(fullPath, files);
    } else if (stat.isFile()) {
      const ext = path.extname(item);
      if (extensions.includes(ext) && !excludePatterns.some(pattern => pattern.test(item))) {
        files.push(fullPath);
      }
    }
  }
  return files;
}

function countLines(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  return content.split('/n').length;
}

function main() {
  console.log('📏 File Size Lint Check/n');
  console.log('Maximum allowed lines: ' + MAX_LINES + '/n');

  let files;
  try {
    files = getFiles(SRC_DIR);
  } catch (error) {
    console.error('Error reading source directory:', error.message);
    process.exit(1);
  }

  const oversizedFiles = [];
  for (const file of files) {
    const lineCount = countLines(file);
    if (lineCount > MAX_LINES) {
      const relativePath = path.relative(process.cwd(), file);
      oversizedFiles.push({ path: relativePath, lines: lineCount });
    }
  }

  oversizedFiles.sort((a, b) => b.lines - a.lines);

  if (oversizedFiles.length > 0) {
    console.error('Found ' + oversizedFiles.length + ' file(s) exceeding ' + MAX_LINES + ' lines:/n');
    console.error('Lines | File');
    console.error('------|----------------------------------------');
    for (const file of oversizedFiles) {
      console.error(file.lines.toString().padStart(5) + ' | ' + file.path);
    }
    console.error('/n' + oversizedFiles.length + ' file(s) exceed the line limit.');
    process.exit(1);
  } else {
    console.log('All ' + files.length + ' files are within the ' + MAX_LINES + ' line limit./n');
    process.exit(0);
  }
}

main();
