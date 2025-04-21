const puppeteer = require('puppeteer');

module.exports = async (req, res) => {
  let browser;
  try {
    browser = await puppeteer.launch({
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      headless: true,
    });
    const page = await browser.newPage();
    await page.goto('https://yaps.kaito.ai/crypto-ai', {
      waitUntil: 'networkidle2',
      timeout: 60000,
    });

    const data = await page.evaluate(() => {
      // 1) Try direct script‐regex for resultWithKol
      const scripts = Array.from(document.querySelectorAll('script'));
      for (const s of scripts) {
        const m = s.textContent.match(/resultWithKol\s*:\s*(\[[\s\S]*?\])/m);
        if (m) {
          try { return JSON.parse(m[1]); } catch {}
        }
      }

      // 2) Fallback: grab Next.js hydration JSON
      const nd = document.getElementById('__NEXT_DATA__');
      if (!nd) return [];
      let json;
      try { json = JSON.parse(nd.textContent); } catch { return []; }

      // 3) Recursively collect arrays in that JSON
      const arrays = [];
      (function recur(o) {
        if (Array.isArray(o)) arrays.push(o);
        else if (o && typeof o === 'object') {
          Object.values(o).forEach(recur);
        }
      })(json);

      // 4) Find the one whose items look like yapper objects
      return (
        arrays.find(
          arr =>
            arr.length > 0 &&
            typeof arr[0] === 'object' &&
            // change these keys if needed
            ('twitterHandle' in arr[0] || 'handle' in arr[0] || 'userId' in arr[0])
        ) || []
      );
    });

    await browser.close();
    res.setHeader('Content-Type', 'application/json');
    res.status(200).json(data);
  } catch (err) {
    if (browser) await browser.close();
    console.error(err);
    res.status(500).json({ error: 'Scrape failed', details: err.message });
  }
};

