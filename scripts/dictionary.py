"""Build the local reader edition from skywind3000/ECDICT (MIT)."""
import csv,json,re,sys
groups={}
for row in csv.DictReader(open(sys.argv[1],encoding='utf8')):
 w=row['word'].lower()
 if not re.fullmatch("[a-z][a-z'-]*",w) or not (row['definition'] and row['translation']):continue
 if not (row['tag'] or row['oxford'] or int(row['bnc'] or 0)>0 or int(row['frq'] or 0)>0):continue
 en=row['definition'].split(r'\n')[:3]
 groups.setdefault(w[0],{})[w]=[row['phonetic'],row['pos'].split('/')[0].split(':')[0], '\n'.join(en),row['translation'].replace(r'\n','\n')[:340],next((x[2:] for x in row['exchange'].split('/') if x.startswith('0:')),'')]
for k,v in groups.items():
 json.dump(v,open('public/dict/'+k+'.json','w'),ensure_ascii=False,separators=(',',':'))
print(sum(map(len,groups.values())))
