import { createServer } from 'vite';
const server = await createServer({
  configFile: '/home/irankunda/alphix-v2/frontend/vite.config.js',
  server: { middlewareMode: true },
  appType: 'custom',
});
try {
  console.log("SSR loading...");
  const mod = await server.ssrLoadModule('/home/irankunda/alphix-v2/frontend/src/app/router.jsx');
  console.log("router loaded", mod.routeConfig.length);
} catch(e) { console.error(e.message, e.stack); }
await server.close();
