import { adminConfig } from '../lib/admin-config.mjs';
import { publicUrl } from '../lib/content.mjs';

const { mode } = adminConfig();
const url = publicUrl(process.env.SITE_URL || process.env.URL || '');
if (mode !== 'ready' || !url) {
  console.error('Ativação pendente: informe DECAP_TURBO_SITE_ID e a URL pública (SITE_URL ou URL da Netlify). Veja README.md.');
  process.exitCode = 1;
} else {
  console.log(`Configuração preenchida para ${url}/admin/. Ainda é necessário validar login, recuperação de senha e publicação com uma conta autorizada.`);
}
