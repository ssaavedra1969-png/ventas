// Script para capturar screenshots de todas las pantallas de FALPAT Ventas
import puppeteer from 'puppeteer'
import { writeFileSync, mkdirSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUTPUT = resolve(__dirname, '..', 'manual', 'screenshots')
const BASE = 'http://localhost:3000'

const PAGES = [
  { path: '/dashboard',                        name: '01-dashboard',           wait: '.glass-card' },
  { path: '/dashboard/parametrias/clientes',   name: '02-clientes',           wait: 'table' },
  { path: '/dashboard/parametrias/productos',  name: '03-productos',          wait: 'table' },
  { path: '/dashboard/parametrias/vendedores', name: '04-vendedores',         wait: 'table' },
  { path: '/dashboard/parametrias/vehiculos',  name: '05-vehiculos',          wait: '.grid' },
  { path: '/dashboard/presupuestos/nuevo',     name: '06-presupuesto-paso1',  wait: 'input' },
  { path: '/dashboard/presupuestos',           name: '07-presupuestos-lista', wait: 'table' },
  { path: '/dashboard/remitos',                name: '08-remitos',            wait: 'table' },
  { path: '/dashboard/facturacion',            name: '09-facturacion',        wait: 'table' },
  { path: '/dashboard/entregas',               name: '10-salidas',            wait: '.grid' },
  { path: '/dashboard/informes',               name: '11-informes',           wait: '.glass-card' },
  { path: '/dashboard/configuracion',          name: '12-configuracion',      wait: '.glass-card' },
]

async function capture() {
  mkdirSync(OUTPUT, { recursive: true })

  const browser = await puppeteer.launch({
    headless: true,
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    defaultViewport: { width: 1440, height: 900 },
  })

  const page = await browser.newPage()
  page.setDefaultTimeout(30000)

  for (const { path, name, wait } of PAGES) {
    console.log(`📸 Capturando ${name}...`)
    try {
      await page.goto(`${BASE}${path}`, { waitUntil: 'networkidle2' })
      // Wait for content selector
      if (wait) {
        try {
          await page.waitForSelector(wait, { timeout: 15000 })
        } catch {
          console.log(`  ⚠️  Selector "${wait}" no encontrado en ${name}, capturando igual`)
        }
      }
      // Small extra wait for animations
      await new Promise(r => setTimeout(r, 2000))
      await page.screenshot({
        path: resolve(OUTPUT, `${name}.png`),
        fullPage: true,
      })
      console.log(`  ✅ ${name}.png guardado`)
    } catch (err) {
      console.error(`  ❌ Error en ${name}: ${err.message}`)
    }
  }

  await browser.close()
  console.log('\n🎉 Capturas completadas en:', OUTPUT)
}

capture().catch(console.error)
