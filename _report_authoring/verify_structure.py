from zipfile import ZipFile
from pathlib import Path
p=Path(r"C:\Users\Administrator\Desktop\work\Web前端开发\停车场管理前端项目文档.docx")
with ZipFile(p) as z:
    xml=z.read('word/document.xml').decode('utf-8')
print('table_count',xml.count('<w:tbl>'))
print('field_caption_present', '表字段明细' in xml)
for i in range(1,9):
    print(f'figure_2_{i}_present', f'图 2-{i}' in xml)
