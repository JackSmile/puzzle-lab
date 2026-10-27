#!/usr/bin/env python3
"""Extract official Russian strings matching the already researched EN tree.
Usage: python3 extract-poe-russian.py /tmp/poe-tree-ru.html /tmp/poe-ascendancy-ru.html
Original strings remain untouched, including source typos and markup.
"""
import collections
import hashlib
import json
import re
import sys
from pathlib import Path
ROOT=Path(__file__).resolve().parent

def numbers(stats,english=False):
 text=' '.join(stats)
 if english:
  text=re.sub(r'\bone\b','1',text,flags=re.I)
  text=re.sub(r'\bonce\b','1',text,flags=re.I)
  text=text.replace('Every Rage','Every 1 Rage')
 return sorted(re.findall(r'[-+]?\d+(?:[.,]\d+)?',text.replace(',','.')))

def extract(tree_path,overview_path):
 html=tree_path.read_text();start=html.index('{',html.index('var passiveSkillTreeData'));raw,_=json.JSONDecoder().raw_decode(html[start:]);version=re.search(r"version: '([^']+)'",html).group(1)
 en=json.loads((ROOT/'poe-classes-source.json').read_text());signatures=json.loads((ROOT/'poe-signatures-source.json').read_text());assert version==en['source']['pageVersion'];assert raw['tree']==en['source']['treeName']
 classes=[]
 for enc,ruc in zip(en['classes'],raw['classes'],strict=True):
  assert enc['baseAttributes']=={'strength':ruc['base_str'],'dexterity':ruc['base_dex'],'intelligence':ruc['base_int']}
  assert [a['id'] for a in enc['ascendancies']]==[a['id'] for a in ruc['ascendancies']]
  classes.append({'id':enc['id'],'name':ruc['name'],'nameEnglish':enc['name'],'treeClassIndex':enc['treeClassIndex'],'baseAttributes':enc['baseAttributes'],'ascendancies':[{'id':rua['id'],'name':rua['name'],'nameEnglish':ena['name']} for ena,rua in zip(enc['ascendancies'],ruc['ascendancies'],strict=True)]})
 nodes={};literal_differences=[]
 for k,enn in en['nodes'].items():
  run=raw['nodes'][k];assert run['skill']==enn['skill'];assert run['ascendancyName']==enn['ascendancyName']
  assert run.get('in',[])==enn.get('in',[]) and run.get('out',[])==enn.get('out',[])
  for flag in ['isNotable','isAscendancyStart','isMultipleChoice','isMultipleChoiceOption']:
   assert run.get(flag)==enn.get(flag),(k,flag)
  if numbers(enn['stats'])!=numbers(run['stats']):
   literal_differences.append(k)
   assert numbers(enn['stats'],True)==numbers(run['stats']),(k,enn['stats'],run['stats'])
  nodes[k]={'skill':run['skill'],'name':run['name'],'nameEnglish':enn['name'],'ascendancyName':run['ascendancyName'],'stats':run['stats'],'reminderText':run.get('reminderText',[])}
 overview_names=re.findall(r'<div class="name">([^<]+)</div>',overview_path.read_text());assert len(overview_names)==21;assert set(overview_names)=={a['name'] for c in classes for a in c['ascendancies']}
 selected=[n['nodeId'] for a in signatures['ascendancies'] for n in a['nodes']];assert len(selected)==84;assert all(k in nodes for k in selected)
 result={'schemaVersion':1,'source':{'retrievedDate':'2026-10-27','language':'ru','treeUrl':'https://ru.pathofexile.com/passive-skill-tree','overviewUrl':'https://ru.pathofexile.com/ascendancy/classes','pageVersion':version,'treeName':raw['tree'],'realm':'pc','mode':'Normal (Default), not Ruthless','treeHtmlSha256':hashlib.sha256(tree_path.read_bytes()).hexdigest(),'overviewHtmlSha256':hashlib.sha256(overview_path.read_bytes()).hexdigest(),'statsPolicy':'Exact official Russian name/stats/reminderText. Preserve source typos, punctuation, markup and line breaks. Runtime mechanics must keep EN parsing/IDs; this file supplies UI text only.'},'classes':classes,'nodes':nodes,'signatureNodeIds':selected,'verification':{'englishSourceFile':'poe-classes-source.json','englishPageVersion':en['source']['pageVersion'],'matchingVersion':True,'matchedClassCount':len(classes),'matchedAscendancyCount':sum(len(c['ascendancies']) for c in classes),'matchedNodeIdsAndAscendancyIds':len(nodes),'matchedGraphsAndNodeFlags':len(nodes),'matchedSignatureCount':len(selected),'numericTokensMatchAfterExplicitLinguisticNormalization':True,'linguisticNormalization':['Only when literal numeric tokens differ: English one -> 1','English once -> 1','English Every Rage -> Every 1 Rage','Russian decimal comma -> decimal point for comparison only'],'literalDigitTokenDifferencesBeforeNormalization':literal_differences,'comparisonScope':'Numeric tokens in stats only; reminderText preserved exactly but its full semantic translation was not independently audited.'},'sourceIssues':[{'nodeId':'55509','nameEnglish':'Avatar of the Wilds','field':'stats[1]','originalPrefix':'Lарует 1 Безудержной ярости','issue':'Official RU source contains Latin L in Lарует. Raw text preserved. A user-facing correction to Дарует is an editorial typo correction, not the raw source.'}]}
 (ROOT/'poe-russian-source.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n');print(f'PASS: version {version}; 7 classes, 21 Ascendancies, {len(nodes)} nodes, 84 signatures; numeric stats and graph/flags match EN. Linguistic-only digit differences: {literal_differences}')
if __name__=='__main__':extract(Path(sys.argv[1]),Path(sys.argv[2]))
