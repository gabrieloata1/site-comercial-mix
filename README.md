# Comercial Mix

Vitrine estática com catálogo sem preços, orçamento pelo WhatsApp e painel Decap CMS em `/admin/`. O Eleventy gera o HTML completo a partir do conteúdo editável. A página pública não precisa de JavaScript para mostrar os produtos.

## Estado da entrega

O código do painel, os campos de edição e a geração do site estão implementados. **A autenticação em produção depende da ativação do Decap Turbo e da conexão do site com a Netlify.** Sem `DECAP_TURBO_SITE_ID`, `/admin/` mostra que o acesso ainda não foi liberado; não usa uma senha fictícia nem um editor público. O build do site continua funcionando.

- Catálogo inicial: seis produtos, três fotos de entregas, texto do cliente, logo e atendimento estadual preservados.
- Produtos: cadastrar, editar nome/descrição/segmento/foto, mostrar ou ocultar e ordenar.
- Entregas: cadastrar e editar fotos e legendas, mostrar ou ocultar e ordenar.
- Contato: WhatsApp, responsável e horário. O número atualiza todos os links e os dados estruturados.
- O texto institucional e o CNPJ ficam fora da edição cotidiana. Não há campos de preço.
- As senhas ficam no serviço de autenticação, não neste repositório. Sidney não precisa de conta no GitHub.

## Desenvolvimento

Requer Node.js 20 ou superior; a Netlify está configurada com Node.js 22.

```sh
npm ci --no-audit --no-fund
npm test
npm run build
npm run dev
```

`npm run dev` abre o site em `http://localhost:8080/` e o painel em `http://localhost:8080/admin/`. Use exatamente `localhost` para a origem permitida. O proxy de edição escuta somente em `127.0.0.1:8081`, modifica os arquivos locais e não faz commits nem push. Encerre com Ctrl+C. Não use esse modo na hospedagem.

O botão de entrada do **modo local** é apenas para desenvolvimento; não testa e-mail, senha ou permissões de produção. `npm run build` gera a versão de produção novamente. Não publique manualmente o `dist` produzido pelo modo local. Builds com `CMS_LOCAL=1` na Netlify/CI falham por segurança.

## Publicação na Netlify

1. Conecte o repositório `gabrieloata1/site-comercial-mix`, branch `main`, à Netlify usando a integração Git. Publicar por arrastar arquivos não atualiza o site após uma edição no painel.
2. Use `npm run build` como comando e `dist` como pasta de publicação. A raiz do repositório é o diretório base. O `netlify.toml` contém essas opções.
3. A variável `URL` fornecida pela Netlify alimenta canonical, compartilhamento e sitemap. Se usar um domínio próprio já configurado, defina `SITE_URL=https://seu-dominio` no ambiente de build. Não configure um domínio ainda não registrado/conectado.
4. Depois de ativar a autenticação abaixo, defina `DECAP_TURBO_SITE_ID` no ambiente de build e faça uma nova publicação.

O antigo redirecionamento de qualquer rota para a home foi removido: recursos ausentes agora retornam 404 e não um HTML disfarçado de imagem ou configuração. Somente `dist/` é publicado; fonte, testes, conteúdo de itens ocultos e arquivos de ambiente ficam fora.

## Ativação do login por e-mail e senha

A integração usa **Decap Turbo**, o backend mantido pela equipe do Decap. Não usa Netlify Identity/Git Gateway em produção nem exige acesso do Sidney ao GitHub.

1. Acesse [Decap Turbo](https://turbo.decapcms.org/) e use uma conta do responsável pelo painel. A senha deve ser definida diretamente no serviço.
2. Em **Git connection**, conecte o GitHub e autorize o aplicativo **somente no repositório `site-comercial-mix`**.
3. Crie o site no Turbo com:
   - Git provider: GitHub;
   - Repository: `gabrieloata1/site-comercial-mix`;
   - Branch: `main`;
   - Config path: `admin/config.yml` (caminho no repositório, não `dist/admin/config.yml`);
   - Admin interface URL: `https://ENDERECO-DO-SITE/admin/`.
4. Copie o **Site ID** público e configure `DECAP_TURBO_SITE_ID` na Netlify. Alternativamente, ele pode ser preenchido em `backend.turbo_site_id` de `admin/config.yml`. Não é uma chave secreta.
5. Libere acesso ao site para a conta que Sidney usará. Uma conta no Turbo sem associação ao site não basta. Não compartilhe uma senha entre pessoas.
6. Publique novamente na Netlify, abra `/admin/` e conclua a validação real descrita abaixo.

**Limites consultados em 18/10/2026:** o plano Free do Turbo inclui um site e **um usuário, contando o proprietário**. Proprietário e Sidney como duas contas precisam de um plano com mais lugares. O Pro divulgado custa €19/mês para um site e cinco usuários. Nenhuma assinatura ou período de teste pago foi ativado por este projeto. Defina a titularidade e confira os valores atuais antes da ativação. Os limites de uso da Netlify também se aplicam; não há promessa de custo total zero.

Referências: [configuração do backend](https://decapcms.org/docs/turbo-connecting-a-site/), [acesso e conexão Git](https://decapcms.org/docs/turbo-getting-started/), [planos](https://decapcms.org/turbo/), [Git Gateway desaconselhado para novas configurações](https://docs.netlify.com/manage/security/secure-access-to-sites/git-gateway/).

## Acompanhar publicação

Salvar no painel cria um commit; o site só muda depois do build bem-sucedido da Netlify. Para o Decap avisar quando a mudança estiver no ar, configure o webhook indicado em **Turbo → site → Deploys** em **Netlify → Project configuration → Notifications → Deploy notifications** para os três eventos: início, sucesso e falha. A URL e o segredo do webhook devem ser cadastrados nos serviços, nunca neste repositório. [Instruções oficiais](https://decapcms.org/docs/turbo-deploy-status-setup/).

Sem esse webhook, confira a publicação na Netlify e no próprio site; o painel não deve ser interpretado como confirmação de deploy.

## Validação antes de liberar para Sidney

`npm test` cobre migração, ocultação/ordenação, imagens, atualização de contato, HTML, JSON-LD, escape de conteúdo, isolamento do acesso local e rejeição de uma ativação inexistente.

Execute `npm run check:activation -- https://comercialmix.netlify.app` para consultar a configuração publicada e confirmar que o Decap Turbo reconhece o Site ID e seu vínculo com este repositório. Sem o argumento, o comando usa `DECAP_TURBO_SITE_ID` e `SITE_URL`/`URL` do ambiente local. Um UUID preenchido ou `mode: ready` sozinho **não comprova ativação**. A consulta também **não comprova login nem publicação real**.

Com as contas e a hospedagem configuradas, execute no celular:

1. Entrar com e-mail e senha autorizados; confirmar que uma conta sem acesso não edita o catálogo.
2. Solicitar recuperação de senha e concluir o acesso pelo e-mail recebido.
3. Cadastrar um produto com foto, descrição e status visível. Publicar e esperar a Netlify.
4. Conferir no site a foto, o texto e o link de WhatsApp; alterar a ordem, ocultar e reativar o item.
5. Editar uma foto de entrega e o contato. Conferir o resultado público e sair do painel.

Fotos: JPG, PNG ou WebP, até 8 MB. Use arquivos menores e nomes novos ao substituir uma imagem. Não apague pela biblioteca uma foto que ainda é usada: o build valida os caminhos e recusa conteúdo com arquivos ausentes. Ocultar um produto retira o card e o item do JSON-LD, mas não é proteção de dados confidenciais: este repositório é público e arquivos/histórico continuam acessíveis.

## Recuperação e manutenção

Cada publicação fica no histórico do Git. Para desfazer um erro, corrija o campo e publique novamente. Para recuperar conteúdo apagado, abra o histórico do arquivo em `content/`, copie o conteúdo da revisão correta para uma nova alteração e faça commit; a Netlify reconstruirá a página. Não reescreva o histórico com `push --force`. Um rollback só na Netlify é temporário: corrija também o repositório antes da próxima publicação.

Arquivos principais:

- `src/index.njk`: apresentação do site;
- `content/products/*.json`, `content/deliveries/*.json`: itens editáveis;
- `content/settings.json`: atendimento;
- `content/faq.json`: perguntas visíveis e JSON-LD, com uma única fonte;
- `admin/config.yml`: campos, coleções e backend;
- `lib/content.mjs`: validação e geração dos dados;
- `src/ajuda.njk`: tutorial do Sidney, acessível em `/admin/ajuda/`;
- `netlify.toml`: build, cache e rotas.

Antes de editar código, atualize sua cópia com os commits do painel. Não use `dist/` como fonte. As dependências estão travadas no `package-lock.json`; atualize-as deliberadamente e valide novamente o painel.
