import { readFileSync } from 'node:fs';
import path from 'node:path';
import { parse } from 'yaml';
import { publicUrl } from './content.mjs';

export function adminConfig(root = process.cwd(), env = process.env) {
  const config = parse(readFileSync(path.join(root, 'admin/config.yml'), 'utf8'));
  const local = env.CMS_LOCAL === '1';
  if (local && (env.NETLIFY || env.CI || env.CONTEXT)) throw new Error('CMS_LOCAL não pode ser publicado. Use apenas npm run dev no computador.');
  if (config.local_backend && !local) throw new Error('Remova local_backend do config.yml. O acesso local só pode ser ativado por npm run dev.');
  const url = publicUrl(env.SITE_URL || env.URL || '');
  if (url) { config.site_url = url; config.display_url = url; }
  const id = (env.DECAP_TURBO_SITE_ID || config.backend.turbo_site_id || '').trim();
  if (id && !/^[a-f\d]{8}-(?:[a-f\d]{4}-){3}[a-f\d]{12}$/i.test(id)) throw new Error('DECAP_TURBO_SITE_ID deve ser o UUID público mostrado pelo Decap Turbo.');
  config.backend.turbo_site_id = id;
  const mode = local ? 'local' : id ? 'ready' : 'pending';
  if (local) {
    config.backend = { name: 'git-gateway', branch: 'main' };
    config.local_backend = { url: 'http://localhost:8081/api/v1' };
  }
  return { mode, config };
}
