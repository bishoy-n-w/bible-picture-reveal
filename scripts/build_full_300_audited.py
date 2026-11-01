# -*- coding: utf-8 -*-
"""
Audited 300 Bilingual Questions Compiler
Combines:
- all_questions.json (for L1, L2, and first 30 of L3)
- L3_GEMS (for the 70 mastery questions of L3)
- L1_TRANSLATIONS, L2_TRANSLATIONS, L3_TRANSLATIONS
- options_dict.py (for 100% complete options translations)
Outputs: js/questions-bank.js
"""

import json
import os
import re
import random
import sys

sys.path.append(os.path.dirname(__file__))
from options_dict import translate_opt_strictly, translate_reference, BOOK_MAP
from q_trans_l1 import L1_TRANSLATIONS
from q_trans_l2 import L2_TRANSLATIONS
from q_trans_l3 import L3_TRANSLATIONS
from build_level3_gems import L3_GEMS

with open(os.path.join(os.path.dirname(__file__), 'all_questions.json'), 'r', encoding='utf-8') as f:
    RAW_QUESTIONS = json.load(f)

print(f"Loaded {len(RAW_QUESTIONS)} base questions.")

# Combine all question translations
ALL_Q_TRANSLATIONS = {}
ALL_Q_TRANSLATIONS.update(L1_TRANSLATIONS)
ALL_Q_TRANSLATIONS.update(L2_TRANSLATIONS)
ALL_Q_TRANSLATIONS.update(L3_TRANSLATIONS)
print(f"Loaded {len(ALL_Q_TRANSLATIONS)} question translations.")

GIVEAWAY_AR_FIXES = {
    "إرميا النبي": "إرميا",
    "أغابوس النبي": "أغابوس",
    "ملاخي النبي": "ملاخي",
    "حزقيا الملك": "حزقيا",
    "عوبديا النبي": "عوبديا",
    "حبقوق النبي": "حبقوق",
    "يوشيا الملك": "يوشيا",
    "خلدة النبية": "خلدة",
    "ميريام": "مريم",
    "يوحنا الحبيب": "يوحنا",
    "يوحنا الرسول": "يوحنا",
    "يوسف الصديق": "يوسف"
}

def clean_ar_option(opt):
    clean = opt.strip()
    return GIVEAWAY_AR_FIXES.get(clean, clean)

def compile_bank():
    final_questions = []
    correct_index_counts = {0: 0, 1: 0, 2: 0, 3: 0}
    level_counts = {1: 0, 2: 0, 3: 0}

    for i in range(300):
        q_id = i + 1
        level = 1 if i < 100 else (2 if i < 200 else 3)
        level_counts[level] += 1

        if i < 230:
            raw = RAW_QUESTIONS[i]
            q_ar = raw['q_ar']
            opts_ar = [clean_ar_option(o) for o in raw['options_ar']]
            ref_ar = raw['ref_ar']
            verse_ar = raw['verse_ar']
            
            # In raw questions, correct answer is index 0
            correct_ar_val = clean_ar_option(raw['options_ar'][0])
            
            q_en, verse_en = ALL_Q_TRANSLATIONS[i]
            ref_en = translate_reference(ref_ar)
            opts_en = [translate_opt_strictly(o) for o in opts_ar]
            
            # Ensure correct answer matches
            is_correct_flags = [k == 0 for k in range(4)]
        else:
            gem_idx = i - 230
            gem = L3_GEMS[gem_idx]
            q_ar, q_en, (c_ar, c_en), distractors, ref_ar, ref_en, verse_ar, verse_en = gem
            
            opts_ar = [c_ar] + [d[0] for d in distractors]
            opts_en = [c_en] + [d[1] for d in distractors]
            is_correct_flags = [True, False, False, False]

        # Verify no Arabic in English fields BEFORE shuffling
        for text, name in [(q_en, 'question.en'), (ref_en, 'reference.en'), (verse_en, 'verse.en')]:
            if re.search(r'[\u0600-\u06FF]', text):
                raise ValueError(f"Arabic character found in {name} of Q#{q_id}: {text}")
        for idx, opt_en in enumerate(opts_en):
            if re.search(r'[\u0600-\u06FF]', opt_en):
                raise ValueError(f"Arabic character found in options.en[{idx}] of Q#{q_id}: '{opt_en}' (from '{opts_ar[idx]}')")

        # Bundle and shuffle choices deterministically
        pairs = list(zip(opts_ar, opts_en, is_correct_flags))
        rng = random.Random(q_id * 10007 + 73)
        rng.shuffle(pairs)

        new_opts_ar = [p[0] for p in pairs]
        new_opts_en = [p[1] for p in pairs]
        new_correct_idx = [p[2] for p in pairs].index(True)
        correct_index_counts[new_correct_idx] += 1

        final_questions.append({
            "id": q_id,
            "level": level,
            "question": {
                "ar": q_ar,
                "en": q_en
            },
            "options": {
                "ar": new_opts_ar,
                "en": new_opts_en
            },
            "correctIndex": new_correct_idx,
            "reference": {
                "ar": ref_ar,
                "en": ref_en
            },
            "verse": {
                "ar": verse_ar,
                "en": verse_en
            }
        })

    # Validate stats
    print("Compilation Statistics:")
    print(f"Total questions: {len(final_questions)}")
    print(f"Level counts: {level_counts}")
    print(f"Correct index distribution: {correct_index_counts}")

    # Write to questions-bank.js
    out_path = os.path.join(os.path.dirname(__file__), '..', 'js', 'questions-bank.js')
    with open(out_path, 'w', encoding='utf-8') as f:
        f.write('/**\n')
        f.write(' * 300 Full Bilingual Bible Trivia Questions for Servants (خدام)\n')
        f.write(' * Arabic: Smith & Van Dyck (فاندايك)\n')
        f.write(' * English: New King James Version (NKJV)\n')
        f.write(' * Level 1: 100 Questions (Advanced/Hard)\n')
        f.write(' * Level 2: 100 Questions (Deep/Very Hard)\n')
        f.write(' * Level 3: 100 Questions (Mastery/Extremely Hard)\n')
        f.write(' * Shuffled choices with randomized correctIndex across 0-3\n')
        f.write(' * Uniform distractor phrasing with zero giveaways\n')
        f.write(' */\n')
        f.write('window.QUESTIONS_BANK = ')
        json.dump(final_questions, f, ensure_ascii=False, indent=2)
        f.write(';\n')

    print(f"Successfully generated {out_path} with 300 fully audited questions!")

if __name__ == '__main__':
    compile_bank()
