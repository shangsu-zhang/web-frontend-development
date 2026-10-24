from zipfile import ZipFile
from pathlib import Path
p=Path(r"C:\Users\Administrator\Desktop\work\Web前端开发\停车场管理前端项目文档.docx")
with ZipFile(p) as z:
    doc=z.read('word/document.xml').decode('utf-8')
    settings=z.read('word/settings.xml').decode('utf-8')
print('toc_field', 'TOC \\o "1-2" \\h \\z \\u' in doc)
print('fldChar_begin', 'w:fldCharType="begin"' in doc)
print('fldChar_end', 'w:fldCharType="end"' in doc)
print('update_fields', 'w:updateFields w:val="true"' in settings)
print('manual_note_present', '目录页码可在 Word 中打开后' in doc)
