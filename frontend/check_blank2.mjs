import { JSDOM } from 'jsdom';
const dom = await JSDOM.fromURL('http://localhost:4173/', {
  runScripts: "dangerously",
  resources: "usable",
  pretendToBeVisual: true,
});
const { window } = dom;
await new Promise(r => setTimeout(r, 3000));
console.log("Body innerHTML:", window.document.body.innerHTML.slice(0,8000));
console.log("Root:", window.document.getElementById('root')?.innerHTML.slice(0,8000));
console.log("Window errors? check console");
