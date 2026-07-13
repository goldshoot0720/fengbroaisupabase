/** Shared language / voice configuration for TTS + translation */

export const VOICE_MAP = {
  'zh-TW': {
    female: 'zh-TW-HsiaoChenNeural',
    male: 'zh-TW-YunJheNeural',
    translate: 'zh-TW'
  },
  'zh-CN': {
    female: 'zh-CN-XiaoxiaoNeural',
    male: 'zh-CN-YunxiNeural',
    translate: 'zh-CN'
  },
  'en-US': {
    female: 'en-US-JennyNeural',
    male: 'en-US-GuyNeural',
    translate: 'en'
  },
  'ja-JP': {
    female: 'ja-JP-NanamiNeural',
    male: 'ja-JP-KeitaNeural',
    translate: 'ja'
  },
  'yue-HK': {
    female: 'zh-HK-HiuMaanNeural',
    male: 'zh-HK-WanLungNeural',
    translate: 'yue'
  },
  'ko-KR': {
    female: 'ko-KR-SunHiNeural',
    male: 'ko-KR-InJoonNeural',
    translate: 'ko'
  }
}

export const LANG_OPTIONS = [
  { value: 'zh-TW', label: '繁體中文', short: '繁中', flag: '🇹🇼' },
  { value: 'zh-CN', label: '簡體中文', short: '簡中', flag: '🇨🇳' },
  { value: 'en-US', label: 'English', short: 'EN', flag: '🇺🇸' },
  { value: 'ja-JP', label: '日本語', short: 'JA', flag: '🇯🇵' },
  { value: 'ko-KR', label: '한국어', short: 'KR', flag: '🇰🇷' },
  { value: 'yue-HK', label: '廣東話', short: '粵', flag: '🇭🇰' }
]

export function isSupportedLanguage(lang) {
  return lang in VOICE_MAP
}

export function toTranslateCode(lang) {
  return VOICE_MAP[lang]?.translate ?? null
}

export function toSourceCode(lang) {
  if (lang === 'auto') return 'auto'
  return VOICE_MAP[lang]?.translate ?? lang
}

export function getVoiceName(language, gender = 'male') {
  const voices = VOICE_MAP[language]
  if (!voices) return VOICE_MAP['zh-TW'].male
  return gender === 'female' ? voices.female : voices.male
}
