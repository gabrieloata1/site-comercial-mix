import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { stringify } from 'yaml';
import { jsonLd } from './lib/content.mjs';
import { adminConfig } from './lib/admin-config.mjs';

export default function (eleventyConfig) {
  eleventyConfig.addWatchTarget('./content/');
  eleventyConfig.addWatchTarget('./admin/');
  eleventyConfig.addWatchTarget('./lib/');
  eleventyConfig.addFilter('jsonLd', jsonLd);
  eleventyConfig.addPassthroughCopy({ 'assets/img/**/*.{jpg,jpeg,png,webp,JPG,JPEG,PNG,WEBP}': 'assets/img' });
  eleventyConfig.addPassthroughCopy({ 'assets/css': 'assets/css' });
  eleventyConfig.addPassthroughCopy({ 'admin/admin.js': 'admin/admin.js', 'admin/admin.css': 'admin/admin.css' });
  eleventyConfig.addPassthroughCopy({ 'node_modules/decap-cms/dist/decap-cms.js': 'admin/decap-cms.js' });
  eleventyConfig.on('eleventy.after', async ({ dir }) => {
    const { mode, config } = adminConfig();
    const destination = path.join(dir.output, 'admin');
    await mkdir(destination, { recursive: true });
    await writeFile(path.join(destination, 'config.yml'), stringify(config));
    await writeFile(path.join(destination, 'runtime.json'), JSON.stringify({ mode, config }));
    if (mode === 'pending') console.warn('Painel ainda não ativado: configure DECAP_TURBO_SITE_ID. O site público continua disponível.');
  });
  return { dir: { input: 'src', output: 'dist' }, templateFormats: ['njk'], htmlTemplateEngine: 'njk' };
}
