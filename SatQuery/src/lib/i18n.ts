export type Language = 'en' | 'hi' | 'kn' | 'ta' | 'te' | 'ml' | 'mr' | 'bn'
export const languages: Record<Language, string> = { en: 'English', hi: 'हिन्दी', kn: 'ಕನ್ನಡ', ta: 'தமிழ்', te: 'తెలుగు', ml: 'മലയാളം', mr: 'मराठी', bn: 'বাংলা' }
const copy: Record<Language, Record<string, string>> = {
  en: { analyze: 'Analyze', input: 'Input imagery', question: 'Ask your question', signIn: 'Sign in', demo: 'Preview with demo data' },
  hi: { analyze: 'विश्लेषण करें', input: 'चित्र डेटा', question: 'अपना प्रश्न पूछें', signIn: 'साइन इन', demo: 'डेमो देखें' },
  kn: { analyze: 'ವಿಶ್ಲೇಷಿಸಿ', input: 'ಚಿತ್ರ ಡೇಟಾ', question: 'ನಿಮ್ಮ ಪ್ರಶ್ನೆ ಕೇಳಿ', signIn: 'ಸೈನ್ ಇನ್', demo: 'ಡೆಮೊ ವೀಕ್ಷಿಸಿ' },
  ta: { analyze: 'பகுப்பாய்வு', input: 'படத் தரவு', question: 'உங்கள் கேள்வியைக் கேளுங்கள்', signIn: 'உள்நுழை', demo: 'டெமோவைப் பார்க்கவும்' },
  te: { analyze: 'విశ్లేషించు', input: 'చిత్ర డేటా', question: 'మీ ప్రశ్న అడగండి', signIn: 'సైన్ ఇన్', demo: 'డెమో చూడండి' },
  ml: { analyze: 'വിശകലനം', input: 'ചിത്ര ഡാറ്റ', question: 'ചോദ്യം ചോദിക്കുക', signIn: 'സൈൻ ഇൻ', demo: 'ഡെമോ കാണുക' },
  mr: { analyze: 'विश्लेषण करा', input: 'प्रतिमा डेटा', question: 'तुमचा प्रश्न विचारा', signIn: 'साइन इन', demo: 'डेमो पहा' },
  bn: { analyze: 'বিশ্লেষণ করুন', input: 'ছবির ডেটা', question: 'আপনার প্রশ্ন করুন', signIn: 'সাইন ইন', demo: 'ডেমো দেখুন' },
}
export function translate(language: Language, key: string) { return copy[language][key] || copy.en[key] || key }
