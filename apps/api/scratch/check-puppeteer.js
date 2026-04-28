const puppeteer = require('puppeteer');

(async () => {
    try {
        console.log('Testing Puppeteer launch...');
        const browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox']
        });
        console.log('SUCCESS: Browser launched successfully!');
        await browser.close();
        process.exit(0);
    } catch (err) {
        console.error('FAILURE: Could not launch browser.');
        console.error(err);
        process.exit(1);
    }
})();
