import sys, io, json
from pptx import Presentation
from pptx.oxml.ns import qn
from PIL import Image
Image.MAX_IMAGE_PIXELS = None
out = {}
for key, path in (('p1', sys.argv[1]), ('p2', sys.argv[2])):
    prs = Presentation(path)
    for i, s in enumerate(prs.slides, 1):
        seen = []; files = []
        for blip in s._element.iter(qn('a:blip')):
            rid = blip.get(qn('r:embed'))
            if not rid or rid not in s.part.rels: continue
            part = s.part.rels[rid].target_part
            if part.partname in seen: continue
            seen.append(part.partname)
            try:
                im = Image.open(io.BytesIO(part.blob))
                if im.width * im.height < 120 * 120: continue
                im = im.convert('RGB'); im.thumbnail((1200, 1200))
            except Exception as e:
                print('skip', key, i, part.partname, e); continue
            fn = f'{key}_{i:03d}_{len(files)+1}.webp'
            im.save(f'{sys.argv[3]}/{fn}', 'WEBP', quality=72, method=5)
            files.append(fn)
        out[f'{key}:{i}'] = files
json.dump(out, open('obrazky.json', 'w', encoding='utf-8'), indent=0)
