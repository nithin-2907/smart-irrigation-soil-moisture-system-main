const express = require('express');
const router = express.Router();
const axios = require('axios');

// Safe replacement for translate-google (which used vulnerable safe-eval)
let translateFn = null;
try {
  const { translate } = require('@vitalets/google-translate-api');
  translateFn = translate;
} catch (e) {
  // optional — falls back to Google Cloud API or LibreTranslate
}

// map UI language names -> ISO codes used by translation API
const LANG_MAP = {
  English: 'en',
  Tamil: 'ta',
  Hindi: 'hi',
  Telugu: 'te'
};

// POST /api/translator/translate
router.post('/translate', async (req, res) => {
  try {
    const { text, from, to } = req.body;
    if (!text || typeof text !== 'string' || !text.trim()) {
      return res.status(400).json({ error: 'Text is required' });
    }

    const source = LANG_MAP[from] || 'auto';
    const target = LANG_MAP[to] || 'en';

    // 1) Try @vitalets/google-translate-api (free, no API key, no safe-eval)
    if (translateFn) {
      try {
        const result = await translateFn(text, { from: source === 'auto' ? undefined : source, to: target });
        const translated = result?.text;
        if (translated) {
          return res.json({ translatedText: translated, provider: 'google-free' });
        }
      } catch (err) {
        console.warn('google-translate-api failed, falling back:', err.message || err);
      }
    }

    // 2) Prefer Google Cloud Translate if API key is configured
    const googleKey = process.env.GOOGLE_TRANSLATE_API_KEY;
    if (googleKey) {
      try {
        const url = `https://translation.googleapis.com/language/translate/v2?key=${googleKey}`;
        const payload = { q: text, target };
        if (source !== 'auto') payload.source = source;

        const resp = await axios.post(url, payload, { timeout: 8000 });
        const translatedText = resp?.data?.data?.translations?.[0]?.translatedText;
        if (translatedText) return res.json({ translatedText, provider: 'google' });
        // otherwise fall through to LibreTranslate
      } catch (gErr) {
        console.warn('Google Translate failed — falling back to LibreTranslate:', gErr.message || gErr);
        // continue to next option
      }
    }

    // 3) try LibreTranslate public instance next
    try {
      const resp = await axios.post(
        'https://libretranslate.de/translate',
        { q: text, source, target, format: 'text' },
        { headers: { 'Content-Type': 'application/json' }, timeout: 8000 }
      );

      const translatedText = resp.data?.translatedText;
      if (translatedText && translatedText.trim()) {
        return res.json({ translatedText, provider: 'libre' });
      }
      // fall through to fallback when empty
    } catch (externalErr) {
      console.warn('External translate failed — using fallback:', externalErr.message || externalErr);
      // continue to fallback
    }

    // --- local fallback translator (improved word-level mapping) ---
    const phraseMap = {
      en: {
        "hello": { ta: "வணக்கம்", hi: "नमस्ते", te: "హలో" },
        "how are you": { ta: "நீங்கள் எப்படி இருக்கிறீர்கள்?", hi: "कैसे हैं आप?", te: "మీరు ఎలా ఉన్నారు?" },
        "thank you": { ta: "நன்றி", hi: "धन्यवाद", te: "ధన్యవాదాలు" },
        "water": { ta: "நீர்", hi: "पानी", te: "నీరు" },
        "soil": { ta: "மண்", hi: "मिट्टी", te: "మట్టి" },
        "rain": { ta: "மழை", hi: "बारिश", te: "వర్షం" },
        "temperature": { ta: "தெப்பநிலை", hi: "तापमान", te: "ఉష్ణోగ్రత" },
        "humidity": { ta: "ஈரப்பதம்", hi: "नमी", te: "తేమ" },
        "crop": { ta: "பயிர்", hi: "फसल", te: "పంట" },
        "predict": { ta: "முன்னறிவு", hi: "पूर्वानुमान", te: "భవిష్యవాణి" },
        "yield": { ta: "உற்பத்தி", hi: "उपज", te: "పంట దిగుబడి" },

        // common small words that often can be omitted in target languages
        "this": { ta: "இது", hi: "यह", te: "ఇది" },
        "is": { ta: "", hi: "है", te: "" },
        "are": { ta: "", hi: "हैं", te: "" },
        "the": { ta: "", hi: "", te: "" },
        "a": { ta: "", hi: "", te: "" },
        "an": { ta: "", hi: "", te: "" },
        "my": { ta: "என்", hi: "मेरा", te: "నా" },
        "you": { ta: "நீங்கள்", hi: "आप", te: "మీరు" },
        "i": { ta: "நான்", hi: "मैं", te: "నేను" }
      }
    };

    const tgt = target;

    // word-level replacement (preserve punctuation/spacing)
    const wordRegex = /[A-Za-z0-9']+/g;
    const translated = text.replace(wordRegex, (token) => {
      const key = token.toLowerCase();

      // phrase exact match (multi-word) — check a few common multi-word phrases first
      const lowerText = text.toLowerCase();
      if (lowerText.includes('how are you') && tgt === 'ta') return phraseMap.en['how are you'].ta;

      if (phraseMap.en[key] && phraseMap.en[key][tgt] !== undefined) {
        const mapped = phraseMap.en[key][tgt];
        return mapped; // allow empty-string mappings (collapse words when appropriate)
      }

      // retain token (names, unknown words)
      return token;
    });

    // collapse extra spaces produced by empty-string mappings and trim
    const fallbackText = translated.replace(/\s+/g, ' ').trim();

    res.json({ translatedText: fallbackText, fallback: true, provider: 'fallback', message: 'Returned best-effort fallback translation' });
  } catch (err) {
    console.error('translator unexpected error:', err);
    res.status(500).json({ error: 'Internal translator error' });
  }
});

module.exports = router;
