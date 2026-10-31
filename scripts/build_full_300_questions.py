# -*- coding: utf-8 -*-
import json
import os
import sys

# Import the 3 datasets
sys.path.append(os.path.dirname(__file__))
from data_level1 import LEVEL_1
from data_level2 import LEVEL_2
from data_level3 import LEVEL_3

print(f"Level 1: {len(LEVEL_1)}")
print(f"Level 2: {len(LEVEL_2)}")
print(f"Level 3: {len(LEVEL_3)}")

all_questions = []
current_id = 1

# Process Level 1
for q, opts, c_idx, ref, verse in LEVEL_1:
    all_questions.append({
        "id": current_id,
        "level": 1,
        "question": q,
        "options": opts,
        "correctIndex": c_idx,
        "reference": ref,
        "verse": verse
    })
    current_id += 1

# Process Level 2
for q, opts, c_idx, ref, verse in LEVEL_2:
    all_questions.append({
        "id": current_id,
        "level": 2,
        "question": q,
        "options": opts,
        "correctIndex": c_idx,
        "reference": ref,
        "verse": verse
    })
    current_id += 1

# Process Level 3
for q, opts, c_idx, ref, verse in LEVEL_3:
    all_questions.append({
        "id": current_id,
        "level": 3,
        "question": q,
        "options": opts,
        "correctIndex": c_idx,
        "reference": ref,
        "verse": verse
    })
    current_id += 1

print(f"Total compiled questions: {len(all_questions)}")

# Write to js/questions-bank.js
out_path = os.path.join(os.path.dirname(__file__), '..', 'js', 'questions-bank.js')
with open(out_path, 'w', encoding='utf-8') as f:
    f.write('/**\n')
    f.write(' * 300 Servant-Level Bible Trivia Questions (خدام)\n')
    f.write(' * Level 1: 100 Questions (Solid Biblical Knowledge)\n')
    f.write(' * Level 2: 100 Questions (Medium/Deep Theological Knowledge)\n')
    f.write(' * Level 3: 100 Questions (Advanced/Hard Biblical Realia)\n')
    f.write(' * Each question includes:\n')
    f.write(' *  - id: 1..300\n')
    f.write(' *  - level: 1 | 2 | 3\n')
    f.write(' *  - question: Arabic question string\n')
    f.write(' *  - options: 4 distinct choices\n')
    f.write(' *  - correctIndex: 0..3\n')
    f.write(' *  - reference: Scripture citation\n')
    f.write(' *  - verse: Full biblical verse text\n')
    f.write(' */\n')
    f.write('window.QUESTIONS_BANK = ')
    json.dump(all_questions, f, ensure_ascii=False, indent=2)
    f.write(';\n')

print(f"Successfully generated {out_path} with {len(all_questions)} questions!")
