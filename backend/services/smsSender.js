/**
 * smsSender.js — Twilio SMS wrapper
 * Gracefully skips sending if env vars are not configured.
 */
let twilio = null;

function getTwilioClient() {
    if (twilio) return twilio;
    const sid = process.env.TWILIO_ACCOUNT_SID;
    const token = process.env.TWILIO_AUTH_TOKEN;
    if (!sid || !token || sid.startsWith("AC_PLACEHOLDER")) {
        return null;
    }
    const TwilioSDK = require("twilio");
    twilio = TwilioSDK(sid, token);
    return twilio;
}

/**
 * Send an SMS message.
 * @param {string} to   - Recipient phone in E.164 format e.g. +919876543210
 * @param {string} body - Message text
 * @returns {Promise<boolean>} true if sent, false if skipped/failed
 */
async function sendSMS(to, body) {
    const from = process.env.TWILIO_FROM_NUMBER;
    const client = getTwilioClient();

    if (!client || !from || !to) {
        console.log(`📵 SMS skipped (Twilio not configured). Would send to ${to}: ${body}`);
        return false;
    }

    try {
        const msg = await client.messages.create({ body, from, to });
        console.log(`✅ SMS sent to ${to} [SID: ${msg.sid}]`);
        return true;
    } catch (err) {
        console.error(`❌ SMS failed to ${to}:`, err.message);
        return false;
    }
}

module.exports = { sendSMS };
