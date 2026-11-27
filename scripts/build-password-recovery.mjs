import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const scripts = dirname(fileURLToPath(import.meta.url));
const portal = resolve(scripts, '..');
const customer = resolve(process.argv[2] ?? resolve(portal, '../猎盈 Customer 端'));
const outDir = resolve(process.argv[3] ?? resolve(portal, 'assets'));
const fromCustomer = createRequire(resolve(customer, 'package.json'));
const viteDirectory = dirname(fromCustomer.resolve('vite/package.json'));
const elementPlus = dirname(fromCustomer.resolve('element-plus/package.json'));
const vueDirectory = dirname(fromCustomer.resolve('vue/package.json'));
const { build } = await import(pathToFileURL(resolve(viteDirectory, 'dist/node/index.js')).href);
const vue = fromCustomer('@vitejs/plugin-vue');

await build({
  root: customer,
  configFile: false,
  publicDir: false,
  plugins: [vue()],
  resolve: {
    alias: [
      { find: 'customer-password-form', replacement: resolve(customer, 'src/components/auth/PasswordChangeForm.vue') },
      { find: /^vue$/, replacement: resolve(vueDirectory, 'dist/vue.runtime.esm-bundler.js') },
      { find: /^element-plus$/, replacement: resolve(elementPlus, 'es/index.mjs') },
      { find: 'element-plus/theme-chalk', replacement: resolve(elementPlus, 'theme-chalk') },
    ],
  },
  define: { 'process.env.NODE_ENV': JSON.stringify('production') },
  build: {
    outDir,
    emptyOutDir: false,
    lib: {
      entry: resolve(scripts, 'password-recovery-entry.js'),
      formats: ['es'],
      fileName: () => 'portal-password-recovery.js',
      cssFileName: 'portal-password-recovery',
    },
    minify: 'esbuild',
  },
});
