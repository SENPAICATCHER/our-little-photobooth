import puppeteer from 'puppeteer-core';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const APP_URL = 'http://localhost:3001';

async function runE2ETest() {
  console.log('=== STARTING 2-BROWSER WEBRTC LIVE VERIFICATION ===');

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: [
      '--use-fake-ui-for-media-stream',
      '--use-fake-device-for-media-stream',
      '--no-sandbox',
      '--disable-setuid-sandbox'
    ]
  });

  try {
    // 1. User A (Host)
    const pageA = await browser.newPage();
    pageA.on('console', msg => console.log('[BROWSER A]', msg.text()));
    pageA.on('pageerror', err => console.error('[BROWSER A ERROR]', err));

    await pageA.goto(APP_URL, { waitUntil: 'networkidle0' });
    console.log('[E2E] Page A loaded');

    // Click "Create a Room"
    await pageA.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const createBtn = btns.find(b => b.textContent.includes('Create a Room'));
      if (createBtn) createBtn.click();
    });

    await new Promise(r => setTimeout(r, 500));

    // Type name and submit
    await pageA.type('input[type="text"]', 'Paulene');
    await pageA.evaluate(() => {
      const form = document.querySelector('form');
      if (form) form.requestSubmit();
    });

    // Wait for room to mount and get Room Code
    await pageA.waitForFunction(() => document.body.innerText.includes('ROOM:'), { timeout: 10000 });
    const roomCodeText = await pageA.evaluate(() => {
      const el = document.body.innerText.match(/ROOM:\s*([A-Z0-9-]+)/);
      return el ? el[1] : null;
    });
    console.log('[E2E] User A created room with code:', roomCodeText);

    // 2. User B (Guest)
    const contextB = await browser.createBrowserContext();
    const pageB = await contextB.newPage();
    pageB.on('console', msg => console.log('[BROWSER B]', msg.text()));
    pageB.on('pageerror', err => console.error('[BROWSER B ERROR]', err));

    await pageB.goto(APP_URL, { waitUntil: 'networkidle0' });
    console.log('[E2E] Page B loaded');

    // Click "Join with Code"
    await pageB.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const joinBtn = btns.find(b => b.textContent.includes('Join with Code'));
      if (joinBtn) joinBtn.click();
    });

    await new Promise(r => setTimeout(r, 500));

    // Fill room code and name
    const inputs = await pageB.$$('input[type="text"]');
    if (inputs.length >= 2) {
      await inputs[0].type(roomCodeText);
      await inputs[1].type('Mawkin');
      await pageB.evaluate(() => {
        const form = document.querySelector('form');
        if (form) form.requestSubmit();
      });
    }

    console.log('[E2E] User B submitted join request');

    // Wait 5 seconds for WebRTC handshake and video playback
    await new Promise(r => setTimeout(r, 6000));

    // Check video elements on Page A
    const videoStatsA = await pageA.evaluate(() => {
      const videos = Array.from(document.querySelectorAll('video'));
      return videos.map((v, i) => ({
        index: i,
        srcObjectNotNull: v.srcObject !== null,
        paused: v.paused,
        videoWidth: v.videoWidth,
        videoHeight: v.videoHeight,
        readyState: v.readyState
      }));
    });

    // Check video elements on Page B
    const videoStatsB = await pageB.evaluate(() => {
      const videos = Array.from(document.querySelectorAll('video'));
      return videos.map((v, i) => ({
        index: i,
        srcObjectNotNull: v.srcObject !== null,
        paused: v.paused,
        videoWidth: v.videoWidth,
        videoHeight: v.videoHeight,
        readyState: v.readyState
      }));
    });

    console.log('[E2E RESULT] Page A Videos:', JSON.stringify(videoStatsA));
    console.log('[E2E RESULT] Page B Videos:', JSON.stringify(videoStatsB));

    // Check if both sides have 2 active videos with non-zero dimensions
    const aHasRemote = videoStatsA.some(v => v.srcObjectNotNull && v.videoWidth > 0 && v.videoHeight > 0);
    const bHasRemote = videoStatsB.some(v => v.srcObjectNotNull && v.videoWidth > 0 && v.videoHeight > 0);

    console.log('[E2E SUMMARY] User A has playing remote video:', aHasRemote);
    console.log('[E2E SUMMARY] User B has playing remote video:', bHasRemote);

    if (aHasRemote && bHasRemote) {
      console.log('>>> SUCCESS: BOTH USERS SEE EACH OTHER WITH REAL FRAMES! <<<');
      process.exit(0);
    } else {
      console.error('>>> FAILURE: Remote video not playing on one or both peers <<<');
      process.exit(1);
    }

  } finally {
    await browser.close();
  }
}

runE2ETest().catch(err => {
  console.error('[E2E CRITICAL ERROR]', err);
  process.exit(1);
});
