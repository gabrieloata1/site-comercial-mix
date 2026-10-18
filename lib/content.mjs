import { readFileSync, readdirSync, realpathSync, statSync } from 'node:fs';
import path from 'node:path';

export const segments = ['Geral', 'Offshore e onshore', 'Construção civil e andaimes', 'Resíduos e reciclagem', 'Agronegócio', 'Logística'];

function text(value, label, max) {
  if (typeof value !== 'string' || !value.trim() || value.length > max) {
    throw new Error(`${label}: preencha um texto de até ${max} caracteres.`);
  }
  return value.trim();
}

export function publicUrl(value = '') {
  if (!value.trim()) return '';
  const url = new URL(value);
  if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash || url.pathname !== '/') {
    throw new Error('SITE_URL deve ser a origem HTTPS do site, sem caminho, senha ou parâmetros.');
  }
  return url.origin;
}

export function validateImage(image, root) {
  if (typeof image !== 'string' || !/^\/assets\/img\/[\p{L}\p{N} _./-]+\.(jpe?g|png|webp)$/iu.test(image) || image.includes('..')) {
    throw new Error('Selecione uma imagem JPG, PNG ou WebP na biblioteca de fotos.');
  }
  const base = realpathSync(path.join(root, 'assets/img')) + path.sep;
  const file = realpathSync(path.join(root, image.slice(1)));
  if (!file.startsWith(base) || !statSync(file).isFile() || statSync(file).size > 8 * 1024 * 1024) {
    throw new Error(`Foto inválida ou acima de 8 MB: ${image}`);
  }
  return image;
}

export function validateEntry(entry, { root, id, kind }) {
  if (!/^[a-zA-Z0-9_-]+$/.test(id)) throw new Error(`Nome de arquivo inválido: ${id}`);
  const fields = ['title', 'description', 'image', 'alt', 'active', 'order', ...(kind === 'products' ? ['segment'] : [])];
  if (Object.keys(entry).some(key => !fields.includes(key))) throw new Error(`${id}: campo desconhecido no catálogo.`);
  if (typeof entry.active !== 'boolean') throw new Error(`${id}: indique se o item está visível.`);
  if (!Number.isInteger(entry.order) || entry.order < 0 || entry.order > 9999) throw new Error(`${id}: ordem deve ser um número inteiro entre 0 e 9999.`);
  if (kind === 'products' && !segments.includes(entry.segment)) throw new Error(`${id}: segmento inválido.`);
  return {
    id,
    title: text(entry.title, `${id}: título`, 120),
    description: text(entry.description, `${id}: descrição`, 1500),
    image: validateImage(entry.image, root),
    alt: text(entry.alt, `${id}: descrição da foto`, 250),
    active: entry.active,
    order: entry.order,
    ...(kind === 'products' ? { segment: entry.segment } : {}),
  };
}

export function jsonLd(value) {
  return JSON.stringify(value).replaceAll('<', '\\u003c').replaceAll('>', '\\u003e').replaceAll('&', '\\u0026');
}

export function loadContent(root = process.cwd(), env = process.env) {
  const read = file => JSON.parse(readFileSync(path.join(root, file), 'utf8'));
  const settings = read('content/settings.json');
  if (!/^55\d{10,11}$/.test(settings.whatsapp)) throw new Error('WhatsApp: informe 55, DDD e número, somente dígitos.');
  settings.contact_name = text(settings.contact_name, 'Responsável', 100);
  settings.hours = text(settings.hours, 'Horário', 200);
  const url = publicUrl(env.SITE_URL || env.URL || '');
  const whatsappUrl = `https://wa.me/${settings.whatsapp}?text=${encodeURIComponent('Olá, vim pelo site da Comercial Mix e gostaria de um orçamento de Big Bags.')}`;
  const phone = settings.whatsapp.slice(2);
  const phoneDisplay = `(${phone.slice(0, 2)}) ${phone.slice(2, -4)}-${phone.slice(-4)}`;
  const entries = kind => readdirSync(path.join(root, 'content', kind))
    .filter(file => file.endsWith('.json')).map(file => validateEntry(read(`content/${kind}/${file}`), { root, id: file.slice(0, -5), kind }))
    .filter(entry => entry.active).sort((a, b) => a.order - b.order || a.id.localeCompare(b.id));
  const products = entries('products').map(product => ({ ...product,
    whatsappUrl: `https://wa.me/${settings.whatsapp}?text=${encodeURIComponent(`Olá, tenho interesse em ${product.title}. Vi no site da Comercial Mix.`)}`,
  }));
  const deliveries = entries('deliveries');
  const faq = read('content/faq.json');
  const schema = { '@context': 'https://schema.org', '@graph': [
    {
      '@type': 'WebSite', '@id': `${url}/#website`, name: 'Comercial Mix Big Bags Seminovos',
      ...(url ? { url: `${url}/` } : {}), publisher: { '@id': `${url}/#business` },
    },
    {
      '@type': 'LocalBusiness', '@id': `${url}/#business`, name: 'Comercial Mix Big Bags Seminovos',
      image: `${url}/assets/img/entrega-caminhao-1.jpg`, telephone: `+${settings.whatsapp}`,
      taxID: '69.468.816/0001-40',
      address: { '@type': 'PostalAddress', addressLocality: 'Macaé', addressRegion: 'RJ', addressCountry: 'BR' },
      areaServed: { '@type': 'State', name: 'Rio de Janeiro', containedInPlace: { '@type': 'Country', name: 'Brasil' } },
      description: 'Fornecimento de big bags seminovos, higienizados e revisados para setores offshore, construção civil, montagem de andaimes, reciclagem e agronegócio.',
    },
    {
      '@type': 'ItemList', '@id': `${url}/#catalogo`, name: 'Catálogo de Big Bags Seminovos',
      numberOfItems: products.length,
      itemListElement: products.map((product, index) => ({
        '@type': 'ListItem', position: index + 1,
        item: { '@type': 'Thing', name: product.title, description: product.description,
          image: `${url}${product.image}`, url: `${url}/#produto-${product.id}` },
      })),
    },
    {
      '@type': 'FAQPage', mainEntity: faq.map(item => ({ '@type': 'Question', name: item.question,
        acceptedAnswer: { '@type': 'Answer', text: item.answer } })),
    },
  ] };
  return { settings, url, whatsappUrl, phoneDisplay, products, deliveries, faq, schema };
}
