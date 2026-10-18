import test from 'node:test';
import assert from 'node:assert/strict';
import { verifyTurboActivation } from '../lib/turbo-activation.mjs';

const runtime = {
  mode: 'ready',
  config: { backend: { name: 'turbo-github', turbo_site_id: 'afcd0391-3fa9-42ac-ada1-80d974e299df', branch: 'main' } },
};
const defaults = { supabase_app_id: 'test-project', supabase_anon_key: 'public-test-key', repo: 'gabrieloata1/site-comercial-mix', branch: 'staging' };
const response = (body, status = 200) => async () => new Response(JSON.stringify(body), { status });

test('UUID preenchido e mode ready não confirmam ativação quando o Turbo retorna 404', async () => {
  await assert.rejects(verifyTurboActivation(runtime, response({ error: 'site not found' }, 404)), /não reconhece o Site ID.*Overview/);
});

test('ativação exige autenticação configurada e vínculo com o repositório correto', async () => {
  await assert.rejects(verifyTurboActivation(runtime, response({ ...defaults, repo: 'outra/conta' })), /vinculado ao repositório/);
  await assert.rejects(verifyTurboActivation(runtime, response({ repo: defaults.repo })), /autenticação incompleta/);
  await assert.rejects(verifyTurboActivation({ ...runtime, mode: 'local' }, response(defaults)), /produção/);
  assert.deepEqual(await verifyTurboActivation(runtime, response(defaults)), { repo: defaults.repo, branch: 'main' });
});

test('indisponibilidade do serviço não é interpretada como ativação', async () => {
  await assert.rejects(verifyTurboActivation(runtime, response({}, 503)), /HTTP 503/);
  await assert.rejects(verifyTurboActivation(runtime, async () => { throw new Error('Network error'); }), /Network error/);
});
