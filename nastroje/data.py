import json, sys, re
from PIL import Image
sys.path.insert(0, '.')
from latin import LAT, SPLIT, MAP, MISSING
species = json.load(open('species.json', encoding='utf-8'))
obr = json.load(open('obrazky.json', encoding='utf-8'))
zdroje = json.load(open('nove/zdroje.json', encoding='utf-8'))
NAZEV = {('p1', 110): '„skokan zelený“', ('p2', 103): 'dronte mauricijský (dodo)'}
def skupina(r):
    for hr, g in ((14, 'Bezlebeční a pláštěnci'), (18, 'Kruhoústí'), (29, 'Paryby'), (92, 'Ryby'),
                  (116, 'Obojživelníci'), (181, 'Plazi'), (372, 'Ptáci'), (567, 'Savci')):
        if r <= hr: return g
PREKLEPY = {'Syngntathiformes': 'Syngnathiformes', 'Chodrichthyes': 'Chondrichthyes', 'Psittacidae)': 'Psittaciformes)', 'Amphisbaeinia': 'Amphisbaenia', 'Testudinidiae': 'Testudinidae', 'Dermochelyoidae': 'Dermochelyidae', 'velemlokovití Cryptobranchidae)': 'velemlokovití (Cryptobranchidae)'}
def clean(t):
    for a, b in PREKLEPY.items(): t = t.replace(a, b)
    return re.sub(r'\s+\)', ')', ' '.join(t.replace('\xa0', ' ').split()).strip())
items = []
for s in species:
    r = s['r']; part = 1 if r <= 116 else 2
    tax = [clean(t) for t in s['tax']]
    base = {'part': part, 'r': r, 'red': s['red'], 'g': skupina(r), 'tax': tax}
    cz = clean(s['cz']).replace('*', '').rstrip(',')
    if r in SPLIT:
        for key, c, lat in SPLIT[r]:
            items.append({**base, 'cz': c, 'lat': lat, 'img': obr[f'{key[0]}:{key[1]}']})
        continue
    if r in MISSING:
        fn = f'novy_{r}.webp'
        im = Image.open(zdroje[str(r)]['file']).convert('RGB'); im.thumbnail((1200, 1200))
        im.save(f'../web/img/{fn}', 'WEBP', quality=72, method=5)
        items.append({**base, 'cz': cz, 'lat': LAT[r], 'img': [fn], 'foto': zdroje[str(r)]['src']})
        continue
    key = tuple(MAP[r]) if r in MAP else tuple(s['slides'][0])
    items.append({**base, 'cz': NAZEV.get(key, cz), 'lat': LAT[r], 'img': obr[f'{key[0]}:{key[1]}']})
for i, it in enumerate(items): it['id'] = i
assert all(it['img'] for it in items)
print(len(items), sum(1 for i in items if i['part'] == 1), sum(1 for i in items if i['part'] == 2))
open('../web/data.js', 'w', encoding='utf-8').write('// Vygenerováno z Excelu a prezentací (prace/data.py)\nconst DRUHY = ' + json.dumps(items, ensure_ascii=False, separators=(',', ':')) + ';\n')
