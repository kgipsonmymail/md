import requests
import os

folder = r'F:\sys\o\OneDrive - LightGroup\programs\2_bytools\claudecode\md\wind\historyword'
files = [f for f in os.listdir(folder) if 'WTI' in f and f.endswith('.docx')]

if files:
    filepath = os.path.join(folder, files[0])
    with open(filepath, 'rb') as f:
        file_part = {'file': (files[0], f, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')}
        print(f'Uploading {files[0]} to /ai-format...')
        r = requests.post('http://localhost:3000/ai-format', files=file_part, timeout=300)
        data = r.json()

        print(f'Success: {data.get("success")}')
        print(f'Filename: {data.get("filename")}')

        if data.get('success') and data.get('markdown'):
            md = data.get('markdown')
            output_file = os.path.join(folder, data.get('filename', 'AI排版-result.txt'))
            with open(output_file, 'w', encoding='utf-8') as f:
                f.write(md)
            print(f'Saved to {output_file}')
            print(f'Markdown length: {len(md)}')
        else:
            print(f'Error: {data.get("error")}')