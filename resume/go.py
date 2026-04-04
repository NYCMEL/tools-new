#!/usr/bin/python3

from docx import Document
import re

# Ask the user for the resume file name
file_name = input("Enter the Word resume file name (with .docx): ").strip()

try:
    doc = Document(file_name)
except Exception as e:
    print(f"Error opening file '{file_name}': {e}")
    exit(1)

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

if skills:
    print("\nExtracted skills:")
    for skill in skills:
        print("-", skill)
else:
    print("No skills found in the resume.")
