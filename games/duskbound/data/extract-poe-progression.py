#!/usr/bin/env python3
"""Extract provenance/formulas/XP from previously fetched Wiki pages.
Usage: python3 extract-poe-progression.py /tmp
See docs/poe-classes-sources.md for source URLs and expected filenames.
"""
import json,re,hashlib,sys
from pathlib import Path
root=Path(__file__).resolve().parent
source_dir=Path(sys.argv[1])
revisions={}
for slug,file in [('Character','character'),('Life','life'),('Mana','mana'),('Accuracy','accuracy'),('Evasion','evasion'),('Ascendancy_class','ascendancy'),('Experience','experience'),('Attribute','attribute')]:
 raw=(source_dir/('poewiki-'+file+'.html')).read_bytes();html=raw.decode();rev=int(re.search(r'"wgRevisionId":(\d+)',html).group(1))
 revisions[slug]={'url':'https://www.poewiki.net/wiki/'+slug,'revisionId':rev,'permalink':'https://www.poewiki.net/index.php?title='+slug+'&oldid='+str(rev),'htmlSha256':hashlib.sha256(raw).hexdigest()}
html=(source_dir/'poewiki-experience.html').read_text();i=html.index('4,250,334,444');a=html.rfind('<table',0,i);b=html.index('</table>',i);table=html[a:b]
levels={}
for row in re.findall(r'<tr[^>]*>(.*?)</tr>',table,re.S):
 cells=[re.sub('<[^>]+>','',v).strip().replace(',','') for v in re.findall(r'<td[^>]*>(.*?)</td>',row,re.S)]
 for start in [0,4]:
  if len(cells)>start+2 and all(cells[x].isdigit() for x in range(start,start+3)):
   level,total,delta=map(int,cells[start:start+3]);levels[level]={'level':level,'totalExperience':total,'experienceToNextLevel':delta}
assert len(levels)==100 and levels[100]['totalExperience']==4250334444
issues=[{'level':n,'tabulatedExperienceToNextLevel':levels[n]['experienceToNextLevel'],'differenceBetweenTabulatedTotals':levels[n+1]['totalExperience']-levels[n]['totalExperience']} for n in range(1,100) if levels[n+1]['totalExperience']-levels[n]['totalExperience']!=levels[n]['experienceToNextLevel']]
obj={
 'schemaVersion':1,'retrievedDate':'2026-10-27','sources':revisions,
 'scope':'Original Path of Exile 1 rules for reference. Duskbound run duration/experience pacing/reset are a separate game adaptation.',
 'level':{'start':1,'maximum':100,'passivePointsPerLevelUp':1,'lifePerLevelUp':12,'manaPerLevelUp':6,'accuracyPerLevelUp':2,'automaticAttributeGainPerLevelUp':{'strength':0,'dexterity':0,'intelligence':0},'sourceKeys':['Character','Experience']},
 'baseFormulas':{
  'life':{'constantAtLevelZero':38,'perLevel':12,'perStrength':0.5,'formula':'38 + 12 * level + strength / 2','levelOneWithoutStrength':50,'sourceKeys':['Life']},
  'mana':{'constantAtLevelZero':34,'perLevel':6,'perIntelligence':0.5,'formula':'34 + 6 * level + intelligence / 2','levelOneWithoutIntelligence':40,'regenerationFractionPerSecond':0.018,'sourceKeys':['Mana']},
  'accuracy':{'perLevel':2,'perDexterity':2,'formula':'2 * level + 2 * dexterity','sourceKeys':['Accuracy','Character']},
  'evasion':{'base':15,'perLevel':0,'dexterityIncreasedPercentPerFive':1,'formulaWithoutOtherModifiers':'15 * (1 + ceil(dexterity / 5) / 100)','sourceKeys':['Evasion'],'roundingCaveat':'Evasion page says Dexterity rounds up to the nearest multiple of 5 for this increased percentage. Final displayed evasion integer rounding not independently verified.'},
  'lifeAndManaRoundingCaveat':'Formulas preserve halves from odd attributes. Final integer rounding is not documented by the fetched pages; do not claim exact displayed integer without additional verification.'
 },
 'attributeBonuses':{'strength':{'maximumLifePerPoint':0.5,'increasedMeleePhysicalDamagePercentPerTen':2},'dexterity':{'accuracyPerPoint':2,'increasedEvasionPercentPerTen':2},'intelligence':{'maximumManaPerPoint':0.5,'increasedMaximumEnergyShieldPercentPerTen':1},'sourceKeys':['Attribute']},
 'rage':{'maximum':30,'moreAttackDamagePercentPerRage':1,'lossPerSecond':10,'lossStartsAfterSecondsWithoutBeingHitOrGainingRage':2,'attackHitGainFromBerserkerSmallPassives':1,'minimumSecondsBetweenRageGainHits':0.5,'grantingOfficialNodeIds':['63583','42861'],'sourceUrl':'https://www.pathofexile.com/passive-skill-tree','sourcePageVersion':'3.29.3b','note':'Rage is not granted automatically to every character. The granting Attack Hit source must be allocated/equipped. Crave the Slaughter modifies loss start and Rage also granting Attack Speed.'},
 'ascendancy':{'maximumPoints':8,'pointsPerFirstCompletionOfEachLabyrinthDifficulty':2,'difficultyCompletions':4,'selection':'Choose one of three Ascendancies associated with the base class after the first Labyrinth.','normalTreeSource':'https://www.pathofexile.com/passive-skill-tree','pointBudgetAlsoVerifiedByOfficialTree':True,'layout':'Notables normally require a preceding small passive; some require a prior notable. Scion Ascendant and Reliquarian use choice hubs and different prerequisites. Preserve graph.','refundCostInRegularPassiveRefundPointsPerAscendancyPoint':5,'sourceKeys':['Ascendancy_class']},
 'originalExperienceTable':[levels[k] for k in sorted(levels)],
 'originalExperienceTableConsistency':{'status':'Source table has inconsistencies; preserved verbatim, not a verified executable XP curve.','mismatches':issues},
 'adaptationRequirements':[
  'Run level reset to 1 and profile/class persistence are Duskbound decisions, not original PoE rules.',
  'Do not claim an automatic class-specific STR/DEX/INT gain per level: original level-up bonuses do not grant these attributes.',
  'Do not claim original passive tree or Ascendancy progression merely from giving free signature effects: original points, choices, and prerequisites matter.',
  'Exact original experience table is provided as provenance; using a compressed short-run XP curve must be labelled adaptation.',
  'Increased/reduced modifiers are additive in a category; more/less modifiers multiply. A literal generic damage bonus cannot replace all original modifier semantics.',
 ]
}
(root/'poe-progression-source.json').write_text(json.dumps(obj,ensure_ascii=False,indent=2)+'\n')
print('Saved progression, formulas, 8 immutable Wiki revision URLs, 100 experience rows; table deltas checked; 3 original-source inconsistencies recorded.')
