/* No password or GitHub token is stored in this project. Turbo owns authentication. */
window.CMS_MANUAL_INIT = true;

(async function start() {
  const message = document.getElementById('loading-message');
  try {
    const response = await fetch('/admin/runtime.json', { cache: 'no-store' });
    if (!response.ok) throw new Error('Configuração indisponível');
    const { mode, config } = await response.json();
    if (mode === 'pending') {
      message.textContent = 'O acesso ao painel ainda está em configuração. Aguarde a liberação pelo responsável pelo site.';
      return;
    }
    if (mode === 'local' && !['localhost', '127.0.0.1', '[::1]'].includes(location.hostname)) {
      throw new Error('O modo local só pode ser aberto neste computador.');
    }
    await new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = '/admin/decap-cms.js';
      script.onload = resolve;
      script.onerror = () => reject(new Error('Não foi possível carregar o editor.'));
      document.head.append(script);
    });
    const CMS = window.CMS;
    CMS.registerPreviewStyle('/assets/css/site.css');
    // Keep the pre-save rules consistent with the build; errors stay in the editor.
    CMS.registerEventListener({ name: 'preSave', handler: ({ entry }) => {
      const collection = entry.get('collection');
      if (['products', 'deliveries'].includes(collection)) {
        const photo = entry.getIn(['data', 'image']);
        if (!/^\/assets\/img\/[\p{L}\p{N} _./-]+\.(jpe?g|png|webp)$/iu.test(photo || '') || photo.includes('..')) {
          throw new Error('Selecione uma foto JPG, PNG ou WebP na biblioteca de imagens.');
        }
        for (const field of ['title', 'description', 'alt']) {
          if (!entry.getIn(['data', field], '').trim()) throw new Error('Preencha nome, descrição e descrição da foto.');
        }
      }
      return entry.get('data');
    } });
    // A preview uses text nodes, never editor-controlled HTML.
    const h = window.h;
    const Preview = window.createClass({
      render() {
        const entry = this.props.entry;
        const photo = this.props.getAsset(entry.getIn(['data', 'image']));
        return h('div', { className: 'container' },
          !entry.getIn(['data', 'active']) ? h('p', null, 'Oculto: este item não aparece no site.') : null,
          h('article', { className: 'card' },
            photo ? h('img', { src: photo.toString(), alt: entry.getIn(['data', 'alt']) }) : null,
            h('div', { className: 'card-body' }, h('h3', null, entry.getIn(['data', 'title'])), h('p', null, entry.getIn(['data', 'description'])),
              entry.get('collection') === 'products' ? h('span', { className: 'card-btn' }, 'Cotar este Modelo no WhatsApp') : null)));
      },
    });
    CMS.registerPreviewTemplate('products', Preview);
    CMS.registerPreviewTemplate('deliveries', Preview);
    CMS.init({ config: { ...config, load_config_file: false } });
    document.getElementById('loading').hidden = true;
  } catch (error) {
    message.textContent = 'Não foi possível abrir o painel. Confira sua conexão e recarregue a página. Se continuar, avise o responsável pelo site.';
    console.error('Falha ao abrir o painel:', error.message);
  }
})();
