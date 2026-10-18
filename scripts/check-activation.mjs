import { adminConfig } from '../lib/admin-config.mjs';
import { publicUrl } from '../lib/content.mjs';
import { verifyTurboActivation } from '../lib/turbo-activation.mjs';

try {
  const publishedUrl = process.argv[2];
  const url = publicUrl(publishedUrl || process.env.SITE_URL || process.env.URL || '');
  if (!url) throw new Error('Informe a URL pública: npm run check:activation -- https://comercialmix.netlify.app');
  let runtime;
  if (publishedUrl) {
    const response = await fetch(`${url}/admin/runtime.json`, { signal: AbortSignal.timeout(10000), cache: 'no-store' });
    if (!response.ok) throw new Error(`Configuração publicada indisponível (HTTP ${response.status}).`);
    runtime = await response.json();
  } else {
    runtime = adminConfig();
  }
  const { repo, branch } = await verifyTurboActivation(runtime);
  console.log(`Site reconhecido pelo Decap Turbo: ${repo}, branch ${branch}. Painel: ${url}/admin/.`);
  console.log('Esta consulta não comprova acesso do usuário. Ainda é necessário testar login, recuperação de senha, upload e publicação com uma conta autorizada.');
} catch (error) {
  console.error(`Ativação não confirmada: ${error.message}`);
  process.exitCode = 1;
}
