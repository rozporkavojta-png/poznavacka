import json, re, unicodedata
d = json.load(open('dump.json', encoding='utf-8'))
a = json.load(open('analyza.json', encoding='utf-8'))
def norm(s):
    s = s.lower().replace('\xa0', ' ').replace('*', '')
    s = re.sub(r'\(.*?\)', '', s)
    return re.sub(r'\s+', ' ', s).strip(' ,;')
rows = [r for r in d['excel'] if r['sheet'] == 'seznam k poznávačce' and 7 <= r['r'] <= 567]
slides = []
for k in ('p1', 'p2'):
    for s in a[k]:
        if not s['texts']: continue
        first = re.split(r'[\x0b\n]', s['texts'][0])[0]
        slides.append((k, s['n'], norm(first), s['texts'][0]))
used = set()
species = []
for r in rows:
    v = r['v']
    name = norm(v[0] + ' ' + v[1])
    hit = [x for x in slides if x[2] == name]
    if not hit:
        hit = [x for x in slides if x[2].startswith(norm(v[0])) and norm(v[1]) and x[2].split(' ')[-1][:4] == norm(v[1]).split(' ')[0][:4]]
    species.append({'r': r['r'], 'cz': (v[0].strip() + ' ' + v[1].strip()).strip(), 'tax': [t.strip() for t in v[3:7] if t.strip()], 'red': r['red'], 'slides': [(x[0], x[1]) for x in hit]})
    for x in hit: used.add((x[0], x[1]))
json.dump(species, open('species.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print('EXCEL BEZ SNIMKU:')
for s in species:
    if not s['slides']: print('  ', s['r'], s['cz'])
print('SNIMKY BEZ EXCELU:')
for x in slides:
    if (x[0], x[1]) not in used: print('  ', x[0], x[1], x[3][:60].replace('\x0b', ' / '))
