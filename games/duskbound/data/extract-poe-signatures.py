#!/usr/bin/env python3
"""Rebuild the 84-node editorial subset from poe-classes-source.json. No network."""
import json,collections
from pathlib import Path
root=Path(__file__).resolve().parent;d=json.loads((root/'poe-classes-source.json').read_text());nodes=d['nodes'];out=[]
for c in d['classes']:
 for a in c['ascendancies']:
  ids=a['nodeIds'];start=next(k for k in ids if nodes[k].get('isAscendancyStart'));paths={start:[start]};todo=collections.deque([start])
  while todo:
   k=todo.popleft()
   for x in nodes[k].get('out',[])+nodes[k].get('in',[]):
    x=str(x)
    if x in ids and x not in paths:paths[x]=paths[k]+[x];todo.append(x)
  selected=[]
  for k in a['signatureCandidateNodeIds']:
   n=nodes[k];path=paths.get(k)
   selected.append({'nodeId':k,'name':n['name'],'stats':n['stats'],'reminderText':n.get('reminderText',[]),'isMultipleChoiceOption':n.get('isMultipleChoiceOption',False),'originalShortestGraphPath':path,'originalPathNodeNames':[nodes[x]['name'] for x in path] if path else None,'originalChoiceHubIds':[x for x in path[:-1] if nodes[x].get('isMultipleChoice')] if path else []})
  req={k for n in selected if n['originalShortestGraphPath'] for k in n['originalShortestGraphPath'][1:]};missing=sorted(k for k in req if nodes[k].get('isNotable') and k not in a['signatureCandidateNodeIds'])
  caveats=[]
  if sum(not nodes[k].get('isMultipleChoiceOption',False) for k in req)>8:caveats.append(f'Allocating all selected options along displayed original paths needs {sum(not nodes[k].get('isMultipleChoiceOption',False) for k in req)} original points, over the original 8-point cap. Duskbound milestone allocation must be labelled adaptation.')
  if missing:caveats.append('Additional original notable dependencies: '+', '.join(nodes[k]['name'] for k in missing))
  out.append({'classId':c['id'],'className':c['name'],'ascendancyId':a['id'],'ascendancyName':a['name'],'sourceUrl':a['sourceUrl'],'nodes':selected,'originalPathUnionPointCount':sum(not nodes[k].get('isMultipleChoiceOption',False) for k in req),'additionalOriginalNotableDependencyIds':missing,'allocationCaveats':caveats,'adaptationCaveat':a['adaptationCaveat']})
(root/'poe-signatures-source.json').write_text(json.dumps({'schemaVersion':1,'source':d['source'],'selectionPolicy':'Exactly four candidate key effects per Ascendancy for Duskbound adaptation. Original full stats are preserved; this is not a legal-build claim. Original path requirements are supplied for review.','ascendancies':out},ensure_ascii=False,indent=2)+'\n')
assert len(out)==21 and sum(len(a['nodes']) for a in out)==84
for a in out:
 print(a['ascendancyName'],a['originalPathUnionPointCount'],'; '.join(a['allocationCaveats']))
 assert all(n['originalShortestGraphPath'] for n in a['nodes']),a['ascendancyName']
