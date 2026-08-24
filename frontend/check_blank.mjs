import { JSDOM } from 'jsdom';
import fs from 'fs';
import path from 'path';

const htmlPath = '/home/irankunda/alphix-v2/frontend/dist/index.html';
let html = fs.readFileSync(htmlPath, 'utf8');
console.log("HTML:", html.slice(0,800));

// Replace script src to be able to load
// Use JSDOM with resources usable to load built JS
const dom = new JSDOM(html, {
  url: 'http://localhost:4173/',
  runScripts: "dangerously",
  resources: "usable",
  pretendToBeVisual: true,
});

const { window } = dom;
window.console.log = (...a) => console.log("[window]", ...a);
window.console.error = (...a) => console.log("[window error]", ...a);

// Wait for scripts to load
await new Promise(r => setTimeout(r, 3000));
console.log("After 3s, body innerHTML length:", window.document.body.innerHTML.length);
console.log("Body:", window.document.body.innerHTML.slice(0,5000));
console.log("Root innerHTML:", window.document.getElementById('root')?.innerHTML.slice(0,5000));
console.log("Done");
