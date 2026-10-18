// Use the same public configuration endpoint as Decap CMS 3.17's Turbo backend.
const configEndpoint = 'https://sb.decapcms.org/functions/v1/config';

export async function verifyTurboActivation(runtime, fetcher = fetch) {
  if (runtime?.mode !== 'ready' || runtime.config?.backend?.name !== 'turbo-github') {
    throw new Error('O painel ainda não está configurado para autenticação em produção.');
  }
  const id = runtime.config.backend.turbo_site_id;
  if (!id) throw new Error('Falta o Site ID do Decap Turbo.');
  const response = await fetcher(`${configEndpoint}?site_id=${encodeURIComponent(id)}`, {
    signal: AbortSignal.timeout(10000),
  });
  if (response.status === 404) {
    throw new Error(`O Decap Turbo não reconhece o Site ID ${id}. Copie o ID da aba Overview do site no Decap Turbo.`);
  }
  if (!response.ok) throw new Error(`Não foi possível verificar o Decap Turbo (HTTP ${response.status}).`);
  const defaults = await response.json();
  if (!defaults?.supabase_app_id || !defaults?.supabase_anon_key) {
    throw new Error('O Decap Turbo retornou uma configuração de autenticação incompleta.');
  }
  if (defaults.repo !== 'gabrieloata1/site-comercial-mix') {
    throw new Error('O site no Decap Turbo precisa estar vinculado ao repositório gabrieloata1/site-comercial-mix.');
  }
  return { repo: defaults.repo, branch: runtime.config.backend.branch || defaults.branch };
}
