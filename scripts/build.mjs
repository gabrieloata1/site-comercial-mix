import { rm } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';

// Clean once before Eleventy starts, never during a watch rebuild.
if (process.env.CMS_LOCAL === '1') throw new Error('npm run build gera produção. Remova CMS_LOCAL; para editar localmente use npm run dev.');
await rm('dist', { recursive: true, force: true });
const result = spawnSync(process.execPath, ['node_modules/@11ty/eleventy/cmd.cjs'], { stdio: 'inherit', env: process.env });
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
