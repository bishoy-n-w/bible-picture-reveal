/**
 * Internationalization (i18n) Engine for Picture Reveal Bible Trivia
 * Supports:
 *  - Independent activation of Arabic and English (Arabic-only, English-only, or Bilingual)
 *  - Automatic direction switching (RTL for Arabic, LTR for English, Balanced for Bilingual)
 *  - Clean typography and bulletproof bidirectional rendering without broken brackets or quotes
 *  - Extensible architecture ready to register new languages in the future
 */

class I18nEngine {
  constructor() {
    this.supportedLanguages = {
      ar: { id: 'ar', name: 'العربية', nativeName: 'العربية', dir: 'rtl', default: true },
      en: { id: 'en', name: 'English', nativeName: 'English', dir: 'ltr', default: false }
    };

    // Load active languages from storage, default to Arabic
    const saved = localStorage.getItem('picture_reveal_languages');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        this.activeLanguages = Array.isArray(parsed) && parsed.length > 0 ? parsed : ['ar'];
      } catch (e) {
        this.activeLanguages = ['ar'];
      }
    } else {
      this.activeLanguages = ['ar'];
    }

    // Translation Dictionaries
    this.strings = {
      ar: {
        brandTitle: "كشف الصورة الكتابية",
        brandSubtitle: "مسابقة الخدام الكنسية",
        welcomeTitle: "كشف الصورة الكتابية",
        welcomeSubtitle: "تحدي المعرفة الكتابية للخدام • هل يمكنك تخمين المشهد المخفي؟",
        step1Title: "1. اختر لوحاً",
        step1Desc: "9 ألواح حجرية بصعوبات متوازنة (متقدم، عميق، فائق) تكشف المشهد بدقة!",
        step2Title: "2. أجب عن السؤال",
        step2Desc: "أجب بدقة لكشف اللوح، الإجابة الخاطئة تغلق اللوح للأبد مع إبراز الشاهد والآية الكاملة!",
        step3Title: "3. خمّن الصورة",
        step3Desc: "استنتج الحدث الكتابي من الأجزاء المكشوفة واحتفل بالنصر بالآية المرجعية الكاملة!",
        startChallenge: "ابدأ التحدي الآن",
        sceneBadgeLabel: "المشهد:",
        home: "الرئيسية",
        mute: "كتم الصوت",
        unmute: "تشغيل الصوت",
        fullscreen: "ملء الشاشة",
        revealFull: "كشف الصورة",
        nextScene: "صورة جديدة",
        resetGrid: "إعادة المربعات",
        chooseScene: "-- اختر صورة (1-20) --",
        sceneItemPrefix: "صورة رقم",
        secretPeekTitle: "✦ إجابة المشهد (سري للمشرف):",
        secondsSuffix: "ثانية",
        timeUp: "انتهى الوقت! ⏰",
        level1Name: "مستوى متقدم (صعب) ✦",
        level2Name: "مستوى عميق (صعب جداً) ✦✦",
        level3Name: "مستوى فائق (شديد الصعوبة) ✦✦✦",
        tileLabel: "المربع رقم",
        correctStatus: "✦ إجابة صحيحة! أحسنت ✦",
        incorrectStatus: "✕ إجابة غير صحيحة! ✕",
        correctAnswerCaption: "الإجابة الصحيحة:",
        referenceLabel: "الشاهد:",
        continueToBoard: "متابعة إلى لوحة الصورة ➔",
        winEmblem: "✦ تم كشف المشهد بنجاح ✦",
        winImageBadge: "✦ المشهد المكتمل ✦",
        returnHome: "العودة للرئيسية 🏠",
        lockedLabel: "مغلق",
        diffEasy: "متقدم",
        diffMedium: "عميق",
        diffHard: "فائق",
        langSelectorTitle: "اللغة:",
        volumeLabel: "مستوى الصوت:",
        timerSettingLabel: "وقت السؤال:",
        timerInfinite: "بدون وقت (∞)",
        arabicLang: "العربية",
        englishLang: "English",
        bothLang: "كلاهما (Bilingual)"
      },
      en: {
        brandTitle: "Bible Picture Reveal",
        brandSubtitle: "Servants Scripture Challenge",
        welcomeTitle: "Bible Picture Reveal",
        welcomeSubtitle: "Scripture Challenge for Church Servants • Can you deduce the hidden biblical scene?",
        step1Title: "1. Select a Tile",
        step1Desc: "9 balanced slabs across 3 difficulty tiers to unveil the sacred image!",
        step2Title: "2. Answer Question",
        step2Desc: "Answer correctly to reveal the slab; incorrect answers lock the tile permanently while disclosing the scripture!",
        step3Title: "3. Guess Picture",
        step3Desc: "Deduce the biblical event from the revealed fragments and celebrate with the full passage citation!",
        startChallenge: "Start the Challenge",
        sceneBadgeLabel: "Scene:",
        home: "Home",
        mute: "Mute",
        unmute: "Unmute",
        volumeLabel: "Volume:",
        timerSettingLabel: "Question Timer:",
        timerInfinite: "Unlimited (∞)",
        fullscreen: "Fullscreen",
        revealFull: "Reveal Picture",
        nextScene: "Next Scene",
        resetGrid: "Reset Tiles",
        chooseScene: "-- Select Scene (1-20) --",
        sceneItemPrefix: "Scene #",
        secretPeekTitle: "✦ Secret Answer (Moderator Only):",
        secondsSuffix: "seconds",
        timeUp: "Time is Up! ⏰",
        level1Name: "Advanced (Hard) ✦",
        level2Name: "Deep (Very Hard) ✦✦",
        level3Name: "Mastery (Extremely Hard) ✦✦✦",
        tileLabel: "Tile #",
        correctStatus: "✦ Correct Answer! Well Done ✦",
        incorrectStatus: "✕ Incorrect Answer! ✕",
        correctAnswerCaption: "Correct Answer:",
        referenceLabel: "Reference:",
        continueToBoard: "Continue to Picture Board ➔",
        winEmblem: "✦ Biblical Scene Successfully Revealed ✦",
        winImageBadge: "✦ Completed Biblical Scene ✦",
        returnHome: "Return Home 🏠",
        lockedLabel: "Locked",
        diffEasy: "Advanced",
        diffMedium: "Deep",
        diffHard: "Mastery",
        langSelectorTitle: "Language:",
        arabicLang: "Arabic (العربية)",
        englishLang: "English",
        bothLang: "Bilingual (كلاهما)"
      }
    };
  }

  isLanguageActive(lang) {
    return this.activeLanguages.includes(lang);
  }

  isBilingual() {
    return this.activeLanguages.includes('ar') && this.activeLanguages.includes('en');
  }

  getPrimaryLanguage() {
    return this.activeLanguages[0] || 'ar';
  }

  toggleLanguage(lang) {
    if (!this.supportedLanguages[lang]) return;

    if (this.activeLanguages.includes(lang)) {
      if (this.activeLanguages.length > 1) {
        this.activeLanguages = this.activeLanguages.filter(l => l !== lang);
      }
    } else {
      this.activeLanguages.push(lang);
    }
    this.persist();
  }

  setMode(mode) {
    if (mode === 'ar') {
      this.activeLanguages = ['ar'];
    } else if (mode === 'en') {
      this.activeLanguages = ['en'];
    } else if (mode === 'both') {
      this.activeLanguages = ['ar', 'en'];
    }
    this.persist();
  }

  persist() {
    localStorage.setItem('picture_reveal_languages', JSON.stringify(this.activeLanguages));
    this.applyDocumentDirection();
  }

  applyDocumentDirection() {
    const isEnOnly = this.activeLanguages.length === 1 && this.activeLanguages[0] === 'en';
    document.documentElement.dir = isEnOnly ? 'ltr' : 'rtl';
    document.documentElement.lang = isEnOnly ? 'en' : 'ar';
    if (document.body) {
      document.body.classList.toggle('bilingual-mode', this.isBilingual());
      document.body.classList.toggle('english-only-mode', isEnOnly);
    }
  }

  // Get localized string for a UI key
  t(key) {
    if (this.isBilingual()) {
      // Clean, structured overrides for bilingual mode
      if (key === 'langSelectorTitle') return 'اللغة • Language:';
      if (key === 'welcomeSubtitle') {
        return `
          <div class="welcome-sub-ar" dir="rtl">تحدي المعرفة الكتابية للخدام • هل يمكنك تخمين المشهد المخفي؟</div>
          <div class="welcome-sub-en" dir="ltr">Scripture Challenge for Servants • Can you deduce the hidden biblical scene?</div>
        `;
      }
      if (key === 'step1Title') {
        return `<div class="step-title-ar" dir="rtl">1. اختر لوحاً</div><div class="step-title-en" dir="ltr">1. Select a Tile</div>`;
      }
      if (key === 'step1Desc') {
        return `<div class="step-desc-ar" dir="rtl">9 ألواح حجرية بصعوبات متوازنة تكشف المشهد بدقة!</div><div class="step-desc-en" dir="ltr">9 balanced slabs across 3 tiers unveil the sacred scene!</div>`;
      }
      if (key === 'step2Title') {
        return `<div class="step-title-ar" dir="rtl">2. أجب عن السؤال</div><div class="step-title-en" dir="ltr">2. Answer Question</div>`;
      }
      if (key === 'step2Desc') {
        return `<div class="step-desc-ar" dir="rtl">أجب بدقة لكشف اللوح، الإجابة الخاطئة تغلقه وتكشف الآية!</div><div class="step-desc-en" dir="ltr">Answer correctly to reveal; wrong answers lock it with scriptures!</div>`;
      }
      if (key === 'step3Title') {
        return `<div class="step-title-ar" dir="rtl">3. خمّن الصورة</div><div class="step-title-en" dir="ltr">3. Guess the Picture</div>`;
      }
      if (key === 'step3Desc') {
        return `<div class="step-desc-ar" dir="rtl">خمّن الحدث الكتابي واحتفل بالنصر والشاهد الكامل!</div><div class="step-desc-en" dir="ltr">Deduce the biblical scene and celebrate with full scriptures!</div>`;
      }
      if (key === 'startChallenge') return 'ابدأ التحدي الآن • Start Challenge';
      if (key === 'sceneBadgeLabel') return 'المشهد / Scene:';
      if (key === 'correctAnswerCaption') return 'الإجابة الصحيحة • Correct Answer:';
      if (key === 'referenceLabel') return 'الشاهد • Reference:';
      if (key === 'brandTitle') return 'كشف الصورة الكتابية';
      if (key === 'brandSubtitle') return 'Bible Picture Reveal • مسابقة الخدام';
      if (key === 'home') return 'الرئيسية • Home';
      if (key === 'revealFull') return 'كشف الصورة • Reveal';
      if (key === 'nextScene') return 'صورة جديدة • Next';
      if (key === 'resetGrid') return 'إعادة المربعات • Reset';
      if (key === 'continueToBoard') return 'متابعة إلى لوحة الصورة • Continue ➔';

      const arStr = (this.strings.ar && this.strings.ar[key]) || key;
      const enStr = (this.strings.en && this.strings.en[key]) || key;
      if (arStr === enStr) return arStr;
      return `${arStr} • ${enStr}`;
    }

    const primary = this.getPrimaryLanguage();
    return (this.strings[primary] && this.strings[primary][key]) || (this.strings.ar && this.strings.ar[key]) || key;
  }

  // Format general bilingual text field (Question, Options, etc.)
  formatField(fieldObj) {
    if (!fieldObj) return '';
    if (typeof fieldObj === 'string') return fieldObj;

    const hasAr = Boolean(fieldObj.ar);
    const hasEn = Boolean(fieldObj.en);

    if (this.isBilingual() && hasAr && hasEn) {
      return `
        <div class="bilingual-text">
          <div class="text-ar" dir="rtl">${fieldObj.ar}</div>
          <div class="text-en" dir="ltr">${fieldObj.en}</div>
        </div>
      `;
    }

    if (this.activeLanguages.length === 1 && this.activeLanguages[0] === 'en') {
      return fieldObj.en || fieldObj.ar || '';
    }

    return fieldObj.ar || fieldObj.en || '';
  }

  // Format scripture verse with clean, isolated quotes per language (NO broken quotes!)
  formatVerse(verseObj) {
    if (!verseObj) return '';
    const textAr = typeof verseObj === 'object' ? verseObj.ar : verseObj;
    const textEn = typeof verseObj === 'object' ? verseObj.en : '';

    if (this.isBilingual() && textAr && textEn) {
      return `
        <div class="bilingual-verse-display">
          <div class="verse-text-ar" dir="rtl">«${textAr}»</div>
          <div class="verse-text-en" dir="ltr">“${textEn}”</div>
        </div>
      `;
    }

    if (this.activeLanguages.length === 1 && this.activeLanguages[0] === 'en' && textEn) {
      return `<div class="verse-text-en" dir="ltr">“${textEn}”</div>`;
    }

    return `<div class="verse-text-ar" dir="rtl">«${textAr || textEn}»</div>`;
  }

  // Format scripture reference badge cleanly (NO stray parenthesis wrapping!)
  formatReference(refObj) {
    if (!refObj) return '';
    const refAr = typeof refObj === 'object' ? refObj.ar : refObj;
    const refEn = typeof refObj === 'object' ? refObj.en : '';

    if (this.isBilingual() && refAr && refEn) {
      return `
        <div class="bilingual-reference-display">
          <span class="ref-item-ar" dir="rtl">${refAr}</span>
          <span class="ref-item-sep">•</span>
          <span class="ref-item-en" dir="ltr">${refEn}</span>
        </div>
      `;
    }

    if (this.activeLanguages.length === 1 && this.activeLanguages[0] === 'en' && refEn) {
      return `<span class="ref-item-en" dir="ltr">${refEn}</span>`;
    }

    return `<span class="ref-item-ar" dir="rtl">${refAr || refEn}</span>`;
  }

  // Extract clean plain text for tooltips / canvas
  getPlainText(fieldObj) {
    if (!fieldObj) return '';
    if (typeof fieldObj === 'string') return fieldObj;
    if (this.isBilingual()) {
      return `${fieldObj.ar || ''} | ${fieldObj.en || ''}`.trim();
    }
    if (this.activeLanguages.length === 1 && this.activeLanguages[0] === 'en') {
      return fieldObj.en || fieldObj.ar || '';
    }
    return fieldObj.ar || fieldObj.en || '';
  }
}

window.i18n = new I18nEngine();
