#!/usr/bin/env python3
"""Extract public Normal tree data; do not fetch media. Python stdlib only.
Usage: python3 extract-poe-classes.py /tmp/poe-tree.html /tmp/poe-ascendancy.html
Fetch source pages independently and save them locally before running.
"""
import hashlib
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
TREE_URL = 'https://www.pathofexile.com/passive-skill-tree'
OVERVIEW_URL = 'https://www.pathofexile.com/ascendancy/classes'
# Editorial suggestions only. These IDs refer to exact, untouched original node text.
PICKS = {
 'Ascendant': ['34567', '10099', '61072', '43122'],
 'Reliquarian': ['36072', '35448', '47058', '40276'],
 'Luminary': ['46479', '1564', '56292', '25944'],
 'Juggernaut': ['5819', '44297', '17988', '53816'],
 'Berserker': ['59920', '29630', '24528', '57560'],
 'Chieftain': ['1731', '48480', '61355', '32249'],
 'Raider': ['33645', '31364', '16848', '55509'],
 'Deadeye': ['26067', '61627', '45313', '24848'],
 'Pathfinder': ['40813', '1697', '51101', '65296'],
 'Occultist': ['37127', '27096', '47630', '25309'],
 'Elementalist': ['53123', '27038', '40810', '61259'],
 'Necromancer': ['54159', '36017', '14603', '11490'],
 'Slayer': ['3184', '62817', '10143', '17315'],
 'Gladiator': ['27864', '15616', '758', '8419'],
 'Champion': ['56967', '31700', '13374', '27604'],
 'Inquisitor': ['48214', '53884', '40059', '39790'],
 'Hierophant': ['40510', '922', '1105', '25651'],
 'Guardian': ['4494', '55146', '39728', '42264'],
 'Assassin': ['19083', '28782', '21264', '19598'],
 'Trickster': ['23225', '55867', '28884', '29825'],
 'Saboteur': ['47778', '5087', '51462', '57175'],
}
NOTES = {
 'Ascendant': 'These are multiple-choice options of class hubs, not standalone full Ascendancies. One option per connected hub; up to two class choices in a typical 8-point build.',
 'Reliquarian': 'These are multiple-choice options of Display hubs. Must respect armour/weapon/jewellery categories. Kaom\'s Roots also removes evasion; Ahn\'s Might changes maximum Frenzy Charges.',
 'Luminary': 'Requires a real Mercenary subsystem, separate from ordinary minions. Do not silently substitute spectres or generic minions for Mercenary.',
 'Juggernaut': 'Undeniable affects Attacks only. Untiring needs prevented Physical Hit damage history and regeneration rate, not generic healing.',
 'Berserker': 'Aspect of Carnage must include increased Damage taken. Instant leech requires valid leech sources. Rage is a separate resource.',
 'Chieftain': 'Hinekora requires kill-triggered maximum-enemy-Life explosions. Ramako only affects stationary player Damage over Time and sets resistance, rather than applying generic penetration.',
 'Raider': 'The current displayed class is Warden. Preserve internal Raider ID for tree linkage. Scorch/Shock/Freeze and Hoarfrost require their own ailment rules.',
 'Deadeye': 'Endless Munitions adds exactly 2 projectiles only to projectile skills. Ricochet requires chain targeting; Far Shot depends on actual projectile travel distance.',
 'Pathfinder': 'Withered and Poison are different effects. Master Toxicist requires any Flask Effect and poisoned kills. Flask charges alone do not provide active flask effects.',
 'Occultist': 'Profane Bloom requires cursed enemies killed by player or minions. Frigid Wake includes its timing, freeze chance, immunity and chilled-hit mitigation.',
 'Elementalist': 'All damage can inflict the named ailment; always inflict alone is insufficient without an ailment system. Do not retain older 3.25 numeric stats.',
 'Necromancer': 'Mindless Aggression is minion-only. Commander of Darkness needs aura counting for its speed line; Bone Barrier needs minion damage leech and Extra Maximum Energy Shield.',
 'Slayer': 'Headsman is a 20%-life execution and its attack/movement speed conditions differ. Overleech needs persistent leech instances, not unconditional regeneration.',
 'Gladiator': 'Bleeding, Aggravated and physical death explosions are separate mechanics. War of Attrition tracks seconds each Rare/Unique enemy has ever been in Presence, capped at 100%.',
 'Champion': 'Taunt, Cannot Evade and increased Damage taken must remain separate effects. Fortitude needs current maximum Fortification. Impale needs stored physical damage and hit counters.',
 'Inquisitor': 'Inevitable Judgement criticals ignore elemental resistance; non-critical hits penetrate 10%. Righteous Providence scales with the lower of STR/INT, not their sum.',
 'Hierophant': 'Arcane Blessing requires Arcane Surge; Divine Guidance includes Transfiguration of Mind and mana-before-life. Totem count bonus is not a minion count bonus.',
 'Guardian': 'Sentinel is a granted level-20 skill with its own stats, not a generic invulnerable summon. Time of Need is regeneration over one second each 4 seconds.',
 'Assassin': 'Opportunistic uses nearby Rare/Unique count. Mistwalker requires full Elusive rules. Knife in the Back and For the Jugular are mutually exclusive options of Assassination Style.',
 'Trickster': 'One Step Ahead is action speed, not just movement. Polymath counts distinct allocated Mastery types. Heartstopper alternates hit/DoT mitigation in exact 5-second halves.',
 'Saboteur': 'Bomb Specialist is a chance for more/less Area Hit damage, not a guaranteed 15% modifier. Blind requires accuracy/evasion; cooldown recovery is not direct cooldown subtraction.',
}

def extract(tree_path, overview_path):
 raw = tree_path.read_bytes()
 html = raw.decode()
 start = html.index('{', html.index('var passiveSkillTreeData'))
 data, _ = json.JSONDecoder().raw_decode(html[start:])
 version = re.search(r"version: '([^']+)'", html).group(1)
 overview = overview_path.read_text()
 names = re.findall(r'<div class="name">([^<]+)</div>', overview)
 class_ids = {a['id'] for c in data['classes'] for a in c['ascendancies']}
 kept = {}
 for key, node in data['nodes'].items():
  if node.get('ascendancyName') in class_ids:
   kept[key] = {k: v for k, v in node.items() if k not in ('icon', 'group', 'orbit', 'orbitIndex')}
 classes = []
 for index, c in enumerate(data['classes']):
  classes.append({
   'treeClassIndex': index, 'id': c['name'].lower(), 'name': c['name'],
   'baseAttributes': {'strength':c['base_str'], 'dexterity':c['base_dex'], 'intelligence':c['base_int']},
   'ascendancies': [{
     'id':a['id'], 'name':a['name'],
     'sourceUrl':OVERVIEW_URL+'/'+a['name'],
     'nodeIds':[k for k,n in kept.items() if n['ascendancyName']==a['id']],
     'signatureCandidateNodeIds':PICKS[a['id']], 'adaptationCaveat':NOTES[a['id']],
   } for a in c['ascendancies']]
  })
 result = {
  'schemaVersion':1,
  'source': {'retrievedDate':'2026-10-27', 'treeUrl':TREE_URL, 'overviewUrl':OVERVIEW_URL,
    'pageVersion':version, 'treeName':data['tree'], 'realm':'pc', 'mode':'Normal (Default), not Ruthless',
    'treeHtmlSha256':hashlib.sha256(raw).hexdigest(),
    'overviewHtmlSha256':hashlib.sha256(overview_path.read_bytes()).hexdigest(),
    'statsPolicy':'Exact original English stats/reminderText, including line breaks and original markup. No balancing or translated paraphrases.',
    'scope':'The 21 base-class Ascendancies in classes[]. Excludes alternate_ascendancies (Bloodline/Wildwood).',
    'countDiscrepancy':{'overviewHeadline':20,'overviewListedNames':names,'actualClassAscendancies':21,
     'resolution':'Use current Default tree classes[]. Seven base classes each have three Ascendancies; overview headline is stale.'}},
  'points':data['points'], 'classes':classes, 'nodes':kept,
  'externalGraphReferences': {k: {field:value for field,value in data['nodes'][k].items() if field not in ('icon','group','orbit','orbitIndex','out','in')} for k in sorted({str(x) for n in kept.values() for x in n.get('in',[])+n.get('out',[]) if str(x) not in kept})},
  'suggestionsNotice':'signatureCandidateNodeIds are editorial implementation candidates only, not an original PoE build or an assertion that all three can be allocated together.',
 }
 (ROOT/'poe-classes-source.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
 for c in classes:
  for a in c['ascendancies']:
   assert a['nodeIds']
   for k in a['signatureCandidateNodeIds']:
    assert kept[k]['ascendancyName']==a['id'] and kept[k]['stats'], (a,k)
 assert len(classes)==7 and sum(len(c['ascendancies']) for c in classes)==21
 assert len(names)==21
 print(f"Extracted {len(classes)} classes, 21 Ascendancies, {len(kept)} nodes, page {version}")

if __name__ == '__main__':
 extract(Path(sys.argv[1]),Path(sys.argv[2]))
