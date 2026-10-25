const { makeWindow, sleep } = require('./util.cjs');

const WHATSAPP_CHANNEL_URL =
  'https://web.whatsapp.com/accept?code=0029VbDorTg2f3ED1P0rjy2H';

async function postToWhatsApp(caption, filePath) {
  const win = makeWindow('whatsapp');

  try {
    // WhatsApp Web open karein
    await win.loadURL('https://web.whatsapp.com');

    // Login aur page load hone ka waqt dein
    await sleep(5000);

    // Apne Channel ka invite link open karein
    await win.loadURL(WHATSAPP_CHANNEL_URL);

    // Channel page load hone ka waqt dein
    await sleep(5000);

    return {
      ok: false,
      message:
        'WhatsApp Channel opened. Automatic posting is not implemented yet.',
      requiresManualPost: true
    };
  } catch (error) {
    return {
      ok: false,
      message: `WhatsApp error: ${error.message}`
    };
  }
}

async function postAll(caption, filePath, platforms) {
  const results = [];

  if (platforms.includes('whatsapp')) {
    const result = await postToWhatsApp(caption, filePath);

    results.push({
      platform: 'whatsapp',
      ...result
    });
  }

  return results;
}

module.exports = { postAll };