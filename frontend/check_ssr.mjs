import { createServer } from 'vite';
const server = await createServer({
  configFile: '/home/irankunda/alphix-v2/frontend/vite.config.js',
  server: { middlewareMode: true },
  appType: 'custom',
});
try {
  console.log("Loading App.jsx via vite SSR...");
  const mod = await server.ssrLoadModule('/src/App.jsx');
  console.log("App loaded:", typeof mod.default);
  console.log("Trying to load router...");
  const routerMod = await server.ssrLoadModule('/src/app/router.jsx');
  console.log("router loaded, config:", routerMod.routeConfig.length);
  console.log("First route path:", routerMod.routeConfig[0].path);
  console.log("SUCCESS - no React is not defined");
} catch(e) {
  console.error("SSR LOAD FAILED:", e.message);
  console.error(e.stack);
} finally {
  await server.close();
}
