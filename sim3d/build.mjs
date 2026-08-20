/* 把 index.html 与 src/*.js 打包成一个可离线双击运行的单文件 HTML */
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const out = process.argv[2] || join(here, '..', 'pc-build-simulator-3d.html');

const html = readFileSync(join(here, 'index.html'), 'utf8');
const files = readdirSync(join(here, 'src')).filter((f) => f.endsWith('.js')).sort();

let bundle = '';
for (const f of files) {
  bundle += '\n/* ==================== src/' + f + ' ==================== */\n';
  bundle += readFileSync(join(here, 'src', f), 'utf8');
}

const scriptTagBlock = /(\n\s*<script src="src\/[^"]+"><\/script>)+/;
if (!scriptTagBlock.test(html)) {
  throw new Error('index.html 中未找到 src 脚本标签块');
}

const single = html.replace(scriptTagBlock, '\n<script>\n' + bundle + '\n</script>');
writeFileSync(out, single, 'utf8');

const kb = (Buffer.byteLength(single, 'utf8') / 1024).toFixed(0);
console.log('已生成单文件：' + out + '  (' + kb + ' KB, 内联 ' + files.length + ' 个模块)');
