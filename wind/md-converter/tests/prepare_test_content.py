import requests
import os
import re

folder = r'F:\sys\o\OneDrive - LightGroup\programs\2_bytools\claudecode\md\wind\historyword'
files = [f for f in os.listdir(folder) if 'WTI' in f and f.endswith('.docx')]

if files:
    filepath = os.path.join(folder, files[0])
    with open(filepath, 'rb') as f:
        file_part = {'file': (files[0], f, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')}
        r = requests.post('http://localhost:3000/convert', files=file_part, timeout=60)
        data = r.json()

        if data.get('success') and data.get('markdown'):
            md = data.get('markdown')

            # 移除 markdown 代码块包裹
            md = re.sub(r'^```markdown\s*', '', md)
            md = re.sub(r'\s*```$', '', md)

            # 保存原始 markdown（带图片URL）
            output_raw = os.path.join(folder, '布伦特-WTI-原始.md')
            with open(output_raw, 'w', encoding='utf-8') as f:
                f.write(md)
            print(f'Saved raw markdown to {output_raw}')

            # 清理 base64 图片用于测试
            md_clean = re.sub(r'!\[.*?\]\(data:image\/[^;]+;base64,[^)]+\)', '![](image)', md)
            output_clean = os.path.join(folder, '布伦特-WTI-清理后.md')
            with open(output_clean, 'w', encoding='utf-8') as f:
                f.write(md_clean)
            print(f'Saved cleaned markdown to {output_clean}')
            print(f'Content length: {len(md_clean)}')