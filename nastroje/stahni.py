import requests, json, sys
H = {'User-Agent': 'poznavacka-skolni-projekt/1.0 (31927@mail.vstecb.cz)'}
T = {81: 'Eurasian ruffe', 481: 'Spotted hyena', 483: 'Brown hyena', 484: 'Aardwolf',
     520: 'Mountain zebra', 521: "Grévy's zebra", 530: 'Masai giraffe', 531: 'Reticulated giraffe'}
info = {}
for r, t in T.items():
    j = requests.get('https://en.wikipedia.org/w/api.php', params={'action': 'query', 'titles': t, 'prop': 'pageimages', 'piprop': 'original|name', 'format': 'json', 'redirects': 1}, headers=H).json()
    p = next(iter(j['query']['pages'].values()))
    url = p['original']['source']; name = p['pageimage']
    # zmenšená verze 1600 px
    j2 = requests.get('https://commons.wikimedia.org/w/api.php', params={'action': 'query', 'titles': 'File:' + name, 'prop': 'imageinfo', 'iiprop': 'url|extmetadata', 'iiurlwidth': 1600, 'format': 'json'}, headers=H).json()
    ii = next(iter(j2['query']['pages'].values()))['imageinfo'][0]
    src = ii.get('thumburl') or ii['url']
    meta = ii.get('extmetadata', {})
    data = requests.get(src, headers=H).content
    ext = src.rsplit('.', 1)[-1].lower()
    open(f'nove/{r}.{ext}', 'wb').write(data)
    info[r] = {'file': f'nove/{r}.{ext}', 'src': ii['descriptionurl'], 'autor': meta.get('Artist', {}).get('value', ''), 'licence': meta.get('LicenseShortName', {}).get('value', '')}
    print(r, t, name, len(data), info[r]['licence'])
json.dump(info, open('nove/zdroje.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
