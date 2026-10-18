import { spawn } from 'node:child_process';
import { rm } from 'node:fs/promises';

if (process.env.NETLIFY || process.env.CI || process.env.CONTEXT) throw new Error('O modo local não pode rodar na hospedagem.');
await rm('dist', { recursive: true, force: true });
const children = [];
let stopping = false;
function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  for (const child of children) child.kill('SIGTERM');
  process.exitCode = code;
}
function run(file, args, env) {
  const child = spawn(process.execPath, [file, ...args], { stdio: 'inherit', env: { ...process.env, ...env } });
  children.push(child);
  child.on('error', error => { console.error(error.message); stop(1); });
  child.on('exit', code => stop(code || 0));
}
run('node_modules/decap-server/dist/index.js', [], { BIND_HOST: '127.0.0.1', PORT: '8081', MODE: 'fs', ORIGIN: 'http://localhost:8080' });
run('node_modules/@11ty/eleventy/cmd.cjs', ['--serve', '--port=8080'], { CMS_LOCAL: '1' });
console.log('Painel local: http://localhost:8080/admin/ — alterações ficam apenas nesta cópia. Ctrl+C para encerrar.');
process.on('SIGINT', () => stop());
process.on('SIGTERM', () => stop());
