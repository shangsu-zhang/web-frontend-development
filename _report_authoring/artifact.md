# Template execution contract

## Reference and evidence
- Reference: `C:\Users\Administrator\Desktop\work\Web前端开发\《Web前端开发技术》项目文档模板.docx`
- SHA-256 at distillation: `0CD0304224572B49B72A78067AB99F2C8BCA851C1F77A53CAAB0C2FB71A8150D`
- Reference render: `C:\Users\Administrator\Desktop\work\_template_render_read` (12 page PNGs; contact sheet reviewed and pages 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12 reviewed individually).
- The original remains unchanged; author into a new report file in the project directory.

## Page system
- One portrait Letter section: 8.5 x 11 inches, margins top/bottom 1.0 inch and left/right 1.25 inches.
- No header/footer content, no first-page variation, and no columns.
- Preserve the source's compact title cover, two-column cover metadata table, black chapter headings, gray italic instruction treatment as a visual cue only, generous whitespace, bordered figure placeholders, centered captions, and five-column mapping table.
- Template typography uses Chinese serif body text with bold black headings and direct paragraph/run formatting. Keep the template's styles and paragraph patterns wherever practical. Do not retain instructional gray prose or placeholder rules/boxes.

## Content order and editable slots
1. Cover: existing report title and subtitle; retain course name `Web前端开发技术`, college `信息学院`; fill student number and name cells with an explicit “待填写（小组全部成员）”; class and completion date marked “待填写”. Do not invent identity data.
2. Contents: replace fill-in instructions with a concise note to insert/update Word automatic TOC after opening; do not fake page numbers.
3. Chapter 1: retain headings 1.1 background, 1.2 functions, 1.3 task allocation. Replace all prompts/rules with project-specific prose. Task allocation must state the known collaboration split only where supported; authorship names remain blank.
4. Chapter 2: eight database entities in DDL order. For each entity, include the existing SQL-derived schema illustration as Figure 2-1 through Figure 2-8, then a compact editable field-design table (columns: field, type, length, constraint, PK/FK, note). Preserve SQL types, keys and constraints. State that the illustrations are derived from SQL/field specifications, not live client screenshots.
5. Chapter 3: extend the actual page pattern to ten subsections in navigation order: overview, parking records, payment records, reports, vehicles, owners, spaces, charge rules, contracts, administrators. Each describes page purpose, fields/tables, and uses the corresponding existing full-page screenshot. Use `index.html#<route>` as the view entry instead of claiming separate HTML files. Captions Figure 3-1 through Figure 3-10.
6. Chapter 4: preserve Table 4-1 and its five columns; provide ten accurate page/table/field-function/screenshot rows. Long content may wrap across pages.
7. Chapter 5, subsection 5.1: explain classic scripts, CSS separation, paired comments, service abstraction, mock persistence, Java adapter, and test command; include compact file tree and a readable directory image/caption Figure 5-1.
8. Chapter 6 is optional bonus. Keep truthful short exchange summaries and adoption notes based on actual user messages/implementation history; no invented verbatim assistant quote or fabricated full transcript screenshots. Remove empty AI screenshot frames. Explain what was modified or not adopted, including no DB connection/no fake identity data.
9. Chapter 7: write a concise evidence-grounded project summary, learning outcomes, known mock-only boundary and Java backend future integration.

## Package and fidelity policy
- Start from a copy of the reference DOCX. Keep its section geometry and recognizable styles; modify content slots and clone table/figure patterns only as needed.
- Preserve the retained reference byte-for-byte and check the recorded SHA-256 before final delivery.
- Source of truth for table design: `C:\Users\Administrator\Desktop\work\停车场管理数据库项目\sql\停车场管理数据库.sql` and `字段设计说明.md`.
- Source of truth for interface scope and routes: `docs\java-api.md`; screenshots are `docs\screenshots\*.png`.
- Render final DOCX to page PNGs, inspect all pages and iterate. Do not call template-derived schema drawings real database screenshots.
