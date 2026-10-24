from zipfile import ZipFile
from pathlib import Path
p=Path(r"C:\Users\Administrator\Desktop\work\Web前端开发\停车场管理前端项目文档.docx")
with ZipFile(p) as z:
    xml=z.read('word/document.xml').decode('utf-8')
print('has_toc_field', 'TOC' in xml)
print('has_fldSimple', '<w:fldSimple' in xml)
print('instruction_mentions', xml.count('目录'))
