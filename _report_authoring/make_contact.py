from PIL import Image,ImageOps,ImageDraw
from pathlib import Path
root=Path(r'C:\Users\Administrator\Desktop\work\Web前端开发\_report_authoring\qa-schema-v3')
files=sorted(root.glob('page-*.png'), key=lambda p:int(p.stem.split('-')[1]))
thumb_w=220
margin=16
label_h=28
rows=[]
for i in range(0,len(files),4):
    row=[]
    for p in files[i:i+4]:
        im=Image.open(p).convert('RGB')
        scale=thumb_w/im.width
        im=im.resize((thumb_w,int(im.height*scale)))
        canvas=Image.new('RGB',(thumb_w,im.height+label_h),'white')
        canvas.paste(im,(0,label_h))
        ImageDraw.Draw(canvas).text((8,6),p.stem,fill='black')
        row.append(canvas)
    while len(row)<4:
        row.append(Image.new('RGB',row[0].size,'white'))
    rows.append(row)
row_h=max(x[0].height for x in rows)
out=Image.new('RGB',(4*thumb_w+5*margin,len(rows)*row_h+(len(rows)+1)*margin),'#dddddd')
for r,row in enumerate(rows):
    for c,im in enumerate(row):
        out.paste(im,(margin+c*(thumb_w+margin),margin+r*(row_h+margin)))
out.save(root/'contact-sheet.png')
print(root/'contact-sheet.png')
