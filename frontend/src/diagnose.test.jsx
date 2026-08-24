// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { createRoot } from 'react-dom/client'
import React from 'react'
import App from './App.jsx'

describe('DIAGNOSE blank', () => {
  it('mounts', async () => {
    document.body.innerHTML = '<div id="root"></div>'
    const c = document.getElementById('root')
    const root = createRoot(c)
    root.render(React.createElement(App))
    await new Promise(r => setTimeout(r, 900))
    console.log("HTML:", c.innerHTML.slice(0, 8000))
    if (c.innerHTML.includes('loading-screen')) console.log("LOADING VISIBLE");
    if (c.innerHTML.includes('ALPHIX')) console.log("ALPHIX FOUND");
    if (c.innerHTML.includes('Accueil')) console.log("HOME FOUND");
    // Le montage ne doit pas produire un DOM vide.
    expect(c.innerHTML.trim().length).toBeGreaterThan(0)
  })
})
