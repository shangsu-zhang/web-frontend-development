from zipfile import ZipFile
from pathlib import Path
from xml.etree import ElementTree as ET
p=Path(r"C:\Users\Administrator\Desktop\work\Web前端开发\停车场管理前端项目文档.docx")
with ZipFile(p) as z:
    media=[n for n in z.namelist() if n.startswith('word/media/')]
    xml=z.read('word/document.xml').decode('utf-8')
print('media_count',len(media))
print('png_count',sum(n.lower().endswith('.png') for n in media))
print('schema_media',sum('schema-' in n for n in media))
print('screenshot_media',sum('screenshot' in n for n in media))
print('field_caption_present', '表字段明细' in xml)
print('schema_caption_count', xml.count('表结构整理图'))
print('docx_bytes', p.stat().st_size)
