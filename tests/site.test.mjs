import test from 'node:test';
import assert from 'node:assert/strict';
import { cpSync, mkdtempSync, readFileSync, writeFileSync, rmSync, symlinkSync, existsSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { loadContent, jsonLd, publicUrl, validateImage } from '../lib/content.mjs';
import { adminConfig } from '../lib/admin-config.mjs';

const root = process.cwd();
const parse = file => JSON.parse(readFileSync(file, 'utf8'));
const write = (file, data) => writeFileSync(file, JSON.stringify(data));
function fixture(t) {
  const folder = mkdtempSync(path.join(os.tmpdir(), 'comercial-mix-test-'));
  for (const entry of ['content', 'assets', 'src', 'admin', 'lib', 'eleventy.config.js', 'package.json']) {
    cpSync(path.join(root, entry), path.join(folder, entry), { recursive: true });
  }
  symlinkSync(path.join(root, 'node_modules'), path.join(folder, 'node_modules'), 'dir');
  t.after(() => rmSync(folder, { recursive: true, force: true }));
  return folder;
}

test('migração mantém seis produtos, três entregas e o WhatsApp do briefing', () => {
  const site = loadContent(root, {});
  assert.equal(site.products.length, 6);
  assert.equal(site.deliveries.length, 3);
  assert.equal(site.settings.whatsapp, '5522998778259');
  assert.equal(site.phoneDisplay, '(22) 99877-8259');
  assert.equal(site.schema['@graph'].find(e => e['@type'] === 'ItemList').numberOfItems, 6);
  assert.ok(!JSON.stringify(site.schema).includes('offers'));
});

test('publicação gera HTML com edição, upload, ordem e ocultação consistentes', t => {
  const folder = fixture(t);
  const hidden = parse(path.join(folder, 'content/products/01.json'));
  hidden.title = 'Produto oculto de teste'; hidden.active = false;
  write(path.join(folder, 'content/products/01.json'), hidden);
  const edited = parse(path.join(folder, 'content/products/02.json'));
  edited.title = 'Novo lote <script>alert("teste")</script>';
  edited.description = 'Descrição atualizada com & e <texto>.';
  edited.order = 0;
  edited.image = '/assets/img/upload-teste.JPG';
  cpSync(path.join(folder, 'assets/img/bigbag-modelo-2.jpg'), path.join(folder, 'assets/img/upload-teste.JPG'));
  write(path.join(folder, 'content/products/novo-lote.json'), edited);
  for (const file of ['01', '02', '03']) {
    const delivery = parse(path.join(folder, `content/deliveries/${file}.json`));
    delivery.active = false;
    write(path.join(folder, `content/deliveries/${file}.json`), delivery);
  }
  const settings = parse(path.join(folder, 'content/settings.json'));
  settings.whatsapp = '5522999991234';
  settings.contact_name = 'Atendimento atualizado';
  write(path.join(folder, 'content/settings.json'), settings);
  const env = { ...process.env, CMS_LOCAL: '', DECAP_TURBO_SITE_ID: '', SITE_URL: 'https://teste.example' };
  execFileSync(process.execPath, [path.join(root, 'node_modules/@11ty/eleventy/cmd.cjs')], { cwd: folder, env, stdio: 'pipe' });
  const output = readFileSync(path.join(folder, 'dist/index.html'), 'utf8');
  assert.ok(output.includes('Os Big Bags seminovos se tornaram a melhor alternativa econômica no momento.'));
  assert.ok(output.includes('Novo lote &lt;script&gt;'));
  assert.ok(!output.includes('Produto oculto de teste'));
  assert.ok(!output.includes('<script>alert'));
  assert.ok(!output.includes('Entregas em Todo o Estado do Rio de Janeiro'));
  assert.ok(output.indexOf('id="produto-novo-lote"') < output.indexOf('id="produto-02"'));
  assert.ok(output.includes('Atendimento atualizado'));
  assert.ok(output.includes('href="https://teste.example/"'));
  const links = [...output.matchAll(/href="(https:\/\/wa.me\/[^\"]+)"/g)].map(m => m[1]);
  assert.ok(links.length >= 8);
  assert.ok(links.every(link => link.startsWith('https://wa.me/5522999991234')));
  assert.ok(existsSync(path.join(folder, 'dist/assets/img/upload-teste.JPG')));
  assert.ok(!existsSync(path.join(folder, 'dist/content')));
  assert.ok(!existsSync(path.join(folder, 'dist/.env')));
  assert.ok(!existsSync(path.join(folder, 'dist/lib')));
  const schema = JSON.parse(output.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
  const list = schema['@graph'].find(item => item['@type'] === 'ItemList');
  assert.equal(list.numberOfItems, 6);
  assert.equal(list.itemListElement[0].item.name, edited.title);
  assert.equal(list.itemListElement[0].item.image, 'https://teste.example/assets/img/upload-teste.JPG');
  const questions = schema['@graph'].find(item => item['@type'] === 'FAQPage').mainEntity;
  assert.ok(questions.every(q => output.includes(q.name) && output.includes(q.acceptedAnswer.text)));
  const runtime = parse(path.join(folder, 'dist/admin/runtime.json'));
  assert.equal(runtime.mode, 'pending');
  assert.equal(runtime.config.backend.name, 'turbo-github');
  assert.ok(!runtime.config.local_backend);
});

test('catálogo vazio mantém orçamento sem inventar produtos', t => {
  const folder = fixture(t);
  for (const file of ['01', '02', '03', '04', '05', '06']) {
    const item = parse(path.join(folder, `content/products/${file}.json`));
    item.active = false;
    write(path.join(folder, `content/products/${file}.json`), item);
  }
  const site = loadContent(folder, {});
  assert.deepEqual(site.products, []);
  assert.equal(site.schema['@graph'].find(e => e['@type'] === 'ItemList').numberOfItems, 0);
});

test('validação impede caminho externo, arquivo ausente e entrada inválida', t => {
  const folder = fixture(t);
  for (const value of ['https://outro.example/imagem.jpg', '/assets/img/../../.env', '/assets/img/x.svg', '/assets/img/ausente.jpg']) {
    assert.throws(() => validateImage(value, folder));
  }
  const item = parse(path.join(folder, 'content/products/01.json'));
  item.order = -1;
  write(path.join(folder, 'content/products/01.json'), item);
  assert.throws(() => loadContent(folder, {}), /ordem/);
  item.order = 1; item.price = 10;
  write(path.join(folder, 'content/products/01.json'), item);
  assert.throws(() => loadContent(folder, {}), /campo desconhecido/);
});

test('configuração de produção nunca ativa acesso local sem autenticação', t => {
  for (const key of ['NETLIFY', 'CI', 'CONTEXT']) assert.throws(() => adminConfig(root, { CMS_LOCAL: '1', [key]: 'true' }), /não pode ser publicado/);
  assert.equal(adminConfig(root, {}).mode, 'pending');
  assert.equal(adminConfig(root, { CMS_LOCAL: '1' }).mode, 'local');
  assert.throws(() => adminConfig(root, { DECAP_TURBO_SITE_ID: 'invalid' }), /UUID/);
  const ready = adminConfig(root, { DECAP_TURBO_SITE_ID: '12345678-1234-1234-1234-123456789abc' });
  assert.equal(ready.mode, 'ready');
  assert.equal(ready.config.backend.name, 'turbo-github');
  assert.ok(!ready.config.local_backend);
  assert.ok(ready.config.collections.every(c => !c.fields?.some(f => /price|preço/.test(f.name))));
  const folder = fixture(t);
  const configFile = path.join(folder, 'admin/config.yml');
  writeFileSync(configFile, readFileSync(configFile, 'utf8') + '\nlocal_backend: true\n');
  assert.throws(() => adminConfig(folder, {}), /Remova local_backend/);
});

test('URLs e dados estruturados não permitem injeção de HTML', () => {
  assert.equal(publicUrl('https://exemplo.com/'), 'https://exemplo.com');
  for (const value of ['javascript:alert(1)', 'https://user:senha@exemplo.com/', 'https://exemplo.com/outra', 'http://exemplo.com']) assert.throws(() => publicUrl(value));
  const hostile = { title: '</script><script>alert(1)</script>' };
  assert.ok(!jsonLd(hostile).includes('</script>'));
  assert.deepEqual(JSON.parse(jsonLd(hostile)), hostile);
});
