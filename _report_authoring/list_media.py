from zipfile import ZipFile
from pathlib import Path
p=Path(r"C:\Users\Administrator\Desktop\work\Web前端开发\停车场管理前端项目文档.docx")
with ZipFile(p) as z:
    print('\n'.join(n for n in z.namelist() if n.startswith('word/media/')))
