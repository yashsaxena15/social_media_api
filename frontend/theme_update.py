import os
import glob

# The brand colors from the user's image:
# #6D23B4, #005BE2, #007DF4, #0098EA, #00ADCD, #00BFA6

replacements = {
    'bg-blue-500': 'bg-gradient-to-r from-brand-purple to-brand-teal',
    'hover:bg-blue-600': 'hover:opacity-90',
    'border-blue-500': 'border-brand-blue',
    'text-blue-500': 'text-brand-blue',
    'text-blue-600': 'text-brand-purple',
    'bg-blue-100': 'bg-brand-purple/10',
    'hover:text-blue-500': 'hover:text-brand-blue',
    'hover:text-blue-600': 'hover:text-brand-purple',
    'hover:bg-blue-50': 'hover:bg-brand-purple/5',
}

def process_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    new_content = content
    for old, new in replacements.items():
        new_content = new_content.replace(old, new)
        
    if new_content != content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print(f"Updated {filepath}")

for filepath in glob.glob('d:/yash/projects/social_media_api/frontend/src/**/*.jsx', recursive=True):
    process_file(filepath)
