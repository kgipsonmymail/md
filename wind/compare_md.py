import os
import re

folder = r'F:\sys\o\OneDrive - LightGroup\programs\2_bytools\claudecode\md\wind\historyword'

with open(os.path.join(folder, 'test.md'), 'r', encoding='utf-8') as f:
    new_md = f.read()

with open(os.path.join(folder, '布伦特-WTI价差史诗级倒挂：当“安全”比“基准”更贵-山金期货-20260417-解析结果.txt'), 'r', encoding='utf-8') as f:
    old_md = f.read()

print(f'New MD length: {len(new_md)}')
print(f'Old MD length: {len(old_md)}')

new_imgs = re.findall(r'!\[.*?\]\([^)]+\)', new_md)
old_imgs = re.findall(r'!\[.*?\]\([^)]+\)', old_md)

print(f'\nNew MD images: {len(new_imgs)}')
for img in new_imgs[:5]:
    print(f'  {img[:100]}')

print(f'\nOld MD images: {len(old_imgs)}')
for img in old_imgs[:5]:
    print(f'  {img[:100]}')