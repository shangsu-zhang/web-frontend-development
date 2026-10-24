from docx import Document
p=r"C:\Users\Administrator\Desktop\work\Web前端开发\停车场管理前端项目文档.docx"
d=Document(p)
for i,para in enumerate(d.paragraphs):
    t=para.text.strip()
    if t and any(k in t for k in ['待填写','尚未','下一阶段','补入','实机截图','未对接','AI 工具交流','真实聊天']):
        print(f'{i}: {t}')
