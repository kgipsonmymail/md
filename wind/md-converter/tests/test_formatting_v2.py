import requests
import os
import re

folder = r'F:\sys\o\OneDrive - LightGroup\programs\2_bytools\claudecode\md\wind\historyword'
output_folder = folder

input_file = os.path.join(folder, '布伦特-WTI-清理后.md')
with open(input_file, 'r', encoding='utf-8') as f:
    content = f.read()

# 处理图片：
# 1. 找到第一个没有标题说明的图片（视频号二维码），替换为PLACEHOLDER
# 2. 把表格里的图片提取出来

lines = content.split('\n')
new_lines = []
in_table = False
table_start = -1
first_image_processed = False

# 简单处理：把所有没有被标题包围的图片alt text是image的替换为IMAGE_PLACEHOLDER
def process_content(content):
    # 找到第一个出现的图片且alt text是image或空白的，标记为删除
    # 图片格式：![alt](url)

    # 匹配所有图片
    img_pattern = r'!\[([^\]]*)\]\(([^)]+)\)'
    matches = list(re.finditer(img_pattern, content))

    if matches:
        # 第一个图片
        first_match = matches[0]
        alt = first_match.group(1)
        if alt == 'image' or alt == '':
            # 替换第一个图片为PLACEHOLDER
            content = content[:first_match.start()] + '![IMAGE_PLACEHOLDER](VIDEO_QR_CODE)' + content[first_match.end():]

    return content

processed_content = process_content(content)

url = 'http://localhost:3000/text-format'

print(f'Input content length: {len(content)} chars')
print(f'Processed content length: {len(processed_content)} chars')

# 发送两次请求获取两个结果
results = []
for i in range(2):
    print(f'\nRequest {i+1}/2...')
    data = {
        'content': processed_content,
        'filename': f'布伦特-WTI-测试排版{i+1}.txt'
    }

    r = requests.post(url, json=data, timeout=300)
    result = r.json()

    if result.get('success'):
        md = result.get('markdown', '')
        results.append(md)
        print(f'Got result {i+1}: {len(md)} chars')
    else:
        print(f'Error: {result.get("error")}')

# 保存结果
for i, md in enumerate(results):
    output_file = os.path.join(output_folder, f'AI排版-结果{i+1}.txt')
    with open(output_file, 'w', encoding='utf-8') as f:
        f.write(md)
    print(f'Saved result {i+1} to {output_file}')

# 对比相似度
if len(results) == 2:
    r1, r2 = results[0], results[1]
    lines1 = set(r1.split('\n'))
    lines2 = set(r2.split('\n'))
    common = lines1 & lines2
    similarity = len(common) / max(len(lines1), len(lines2), 1) * 100
    print(f'\nSimilarity: {similarity:.1f}%')