from zipfile import ZipFile
from pathlib import Path
p=Path(r"C:\Users\Administrator\Desktop\work\Web前端开发\停车场管理前端项目文档.docx")
with ZipFile(p) as z:
    doc=z.read('word/document.xml').decode('utf-8')
    settings=z.read('word/settings.xml').decode('utf-8')
print('toc_field_present', 'TOC \\o "1-2" \\h \\z \\u' in doc)
print('update_fields_on_open', 'w:updateFields w:val="true"' in settings)
print('toc_cached_headings', all(x in doc for x in ['一、项目概述','二、数据库表结构','七、项目总结']))
print('manual_insert_instruction', '通过“引用' in doc)
