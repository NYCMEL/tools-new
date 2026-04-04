#!/usr/bin/python3

from docx import Document
import re

doc = Document('_Mel.M.Heravi.docx')
skills = []

collect = False  # Flag to know when to collect skills

for para in doc.paragraphs:
    text = para.text.strip()
    
    # Start collecting after finding "Skills" section
    if "skills" in text.lower():
        collect = True
        continue

    # Stop collecting if next major section or empty line
    if collect:
        if text == "" or re.search(r'\b(experience|education|projects|certifications|achievements)\b', text, re.IGNORECASE):
            collect = False
            continue
        
        # Split bullets, dashes, or commas
        skills += re.split(r',|•|-', text)

# Clean up whitespace
skills = [s.strip() for s in skills if s.strip() != ""]

print("Extracted skills:")
for skill in skills:
    print("-", skill)
