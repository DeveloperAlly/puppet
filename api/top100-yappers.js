const puppeteer = require('puppeteer');

export default async function handler(req, res) {
  const browser = await puppeteer.launch({
    args: ['--no-sandbox'],
    headless: true
  });
  const page = await browser.newPage();

  try {
    await page.goto('https://yaps.kaito.ai/crypto-ai', { waitUntil: 'networkidle2' });

    const data = await page.evaluate(() => {
      const scriptTags = Array.from(document.querySelectorAll('script'));
      const targetScript = scriptTags.find(script => script.textContent.includes('resultWithKol'));
      const jsonText = targetScript.textContent.match(/"resultWithKol":\s*(\[[\s\S]*?\])\s*,\s*"?/);
      return jsonText ? JSON.parse(jsonText[1]) : [];
    });

    await browser.close();
    res.setHeader('Content-Type', 'application/json');
    res.status(200).json(data);
  } catch (err) {
    await browser.close();
    res.status(500).json({ error: 'Failed to scrape data', details: err.message });
  }
}

