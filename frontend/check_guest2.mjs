import { JSDOM } from 'jsdom';
const dom = new JSDOM(`<!doctype html><html><body></body></html>`, { url: 'http://localhost:3000/' });
global.window = dom.window;
global.document = dom.window.document;
import { createServer } from 'vite';
const server = await createServer({
  configFile: '/home/irankunda/alphix-v2/frontend/vite.config.js',
  server: { middlewareMode: true },
});
try {
  const gl = await server.ssrLoadModule('/src/layouts/GuestLayout.jsx');
  console.log("GuestLayout loaded:", typeof gl.default);
  console.log(gl.default.toString().slice(0,500));
  const hp = await server.ssrLoadModule('/src/pages/HomePage.jsx');
  console.log("HomePage loaded:", typeof hp.default);
  console.log(hp.default.toString().slice(0,500));
  console.log("SUCCESS");
} catch(e) {
  console.error("Error:", e.message);
  console.error(e.stack.slice(0,3000));
} finally { await server.close(); }
