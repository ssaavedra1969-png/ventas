const puppeteer = require('puppeteer');
const path = require('path');

(async () => {
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    args: ['--no-sandbox'],
  });

  const page = await browser.newPage();
  const htmlPath = 'file:///C:/AI/Antigravity/FALPAT%20Ventas/manual/manual.html';

  console.log('Loading HTML...');
  await page.goto(htmlPath, { waitUntil: 'networkidle0', timeout: 30000 });
  await new Promise(r => setTimeout(r, 3000));

  console.log('Generating PDF...');
  await page.pdf({
    path: 'C:\\AI\\Antigravity\\FALPAT Ventas\\manual\\FALPAT_Ventas_Manual_Usuario.pdf',
    format: 'A4',
    printBackground: true,
    margin: { top: '20mm', bottom: '20mm', left: '15mm', right: '15mm' },
    displayHeaderFooter: true,
    headerTemplate: '<div></div>',
    footerTemplate: '<div style="width:100%;text-align:center;font-size:9px;color:#6B6B8A;font-family:Inter,sans-serif;padding-top:5px;">FALPAT Ventas — Manual de Usuario | Página <span class="pageNumber"></span> de <span class="totalPages"></span></div>',
  });

  console.log('PDF generated successfully!');
  await browser.close();
})().catch(e => { console.error('Error:', e.message); process.exit(1); });
