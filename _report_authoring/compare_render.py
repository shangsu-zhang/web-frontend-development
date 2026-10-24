from pathlib import Path
import hashlib
old=Path(r"C:\Users\Administrator\Desktop\work\Web前端开发\_report_authoring\qa-schema-v3")
new=Path(r"C:\Users\Administrator\Desktop\work\Web前端开发\_report_authoring\qa-toc-v2")
def h(p):
    return hashlib.sha256(p.read_bytes()).hexdigest()
changed=[]
for i in range(1,27):
    a=old/f'page-{i}.png'; b=new/f'page-{i}.png'
    if h(a)!=h(b): changed.append(i)
print('changed_pages', changed)
