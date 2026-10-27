// Card translations keep originalSourceStats untouched for inspectable source comparison.
const exact={
 '+10% to all Elemental Resistances':'+10% ко всем сопротивлениям стихиям',
 '+5% to maximum Cold Resistance':'+5% к максимальному сопротивлению холоду',
 '+6% Chance to Block (32% total)':'+6% к шансу блока (всего на щите 32%)',
 'Recover Energy Shield equal to 2% of Armour when you Block':'При блоке восстанавливает энергощит в размере 2% фактической брони',
 '+4% to all Elemental Resistances (implicit)':'+4% ко всем сопротивлениям стихиям (собственное свойство)',
 '+4% to all maximum Resistances':'+4% ко всем максимальным сопротивлениям, включая хаос',
 'Cannot Block Attack Damage':'Нельзя блокировать урон атак',
 'Shocked Enemies you Kill Explode, dealing 5% of their Life as Lightning Damage which cannot Shock':'Убитые вами враги под шоком взрываются: 5% их здоровья в виде урона молнией; этот взрыв не может наложить шок',
 'Unaffected by Shock':'Шок не оказывает на вас воздействия',
 '2% of Attack Damage Leeched as Life':'2% урона атак похищается в виде здоровья',
 'You lose all Endurance Charges when Hit':'При получении попадания теряет все заряды выносливости',
 'You gain an Endurance Charge on Kill':'При убийстве получает заряд выносливости',
 'You gain Onslaught for 5 seconds per Endurance Charge when Hit':'При получении попадания получает Натиск на 5 с за каждый заряд выносливости',
 '100% increased Effect of Onslaught on you':'100% увеличение эффекта Натиска на вас',
 '-30% to Fire Resistance':'−30% к сопротивлению огню',
 'Attacks have 150% Arcane Might':'Атаки имеют 150% Arcane Might: увеличение и уменьшение урона чар действует на урон атак с коэффициентом 1,5',
 '30% reduced Duration of Ailments on Enemies':'30% уменьшение длительности состояний на врагах',
 'Your Elemental Damage can Shock':'Ваш урон стихиями может наложить шок',
 '10% chance to Ignite':'10% шанс поджечь',
 'Take 100 Fire Damage when you Ignite an Enemy':'Получает 100 урона огнём при поджоге врага',
 '2% of Fire Damage Leeched as Life while Ignited':'Во время поджога самого героя 2% урона огнём похищается в виде здоровья',
 'When you Kill a Shocked Enemy, inflict an equivalent Shock on each nearby Enemy':'При убийстве врага под шоком накладывает на каждого ближайшего врага шок той же силы и оставшейся длительности',
 'When you Kill an Ignited Enemy, inflict an equivalent Ignite on each nearby Enemy':'При убийстве подожжённого врага накладывает на каждого ближайшего врага поджог с теми же уроном в секунду и оставшейся длительностью',
 'Enemies you Kill have a 20% chance to Explode, dealing a quarter of their maximum Life as Chaos Damage':'Убитые вами враги с шансом 20% взрываются: 25% их максимального здоровья в виде урона хаосом',
 '+360 to Accuracy Rating':'+360 к меткости',
 '20% increased Attack Speed (local)':'20% увеличение скорости атаки этого оружия',
 'Gain 10 Mana per Enemy Killed':'Восстанавливает 10 маны за убитого врага',
 '10% increased Movement Speed':'10% увеличение скорости передвижения',
 'Gain a Frenzy Charge on Critical Strike':'При критическом ударе получает заряд ярости',
 'Curse Enemies with Temporal Chains on Hit':'При попадании проклинает врагов Путами времени 1-го уровня',
 'Non-Aura Curses you inflict are not removed from Dying Enemies':'Наложенные вами проклятия, не являющиеся аурами, сохраняются на умирающих врагах',
 'Enemies near corpses affected by your Curses are Blinded':'Враги около трупов под действием ваших проклятий ослеплены',
 'Enemies Killed near corpses affected by your Curses explode, dealing 3% of their Life as Physical Damage':'Враги, убитые около трупов под действием ваших проклятий, взрываются: 3% их здоровья в виде физического урона',
 'Corrupted Blood cannot be inflicted on you':'На вас нельзя наложить Осквернённую кровь; это не иммунитет к кровотечению',
};
const suffix={
 'increased Armour and Energy Shield (local)':'увеличение брони и энергощита этого предмета',
 'increased Elemental Damage with Attack Skills':'увеличение урона стихиями умениями атак',
 'Chance to Block Spell Damage':'шанс блокировать урон чар',
 'increased Spell Damage':'увеличение урона чар',
 'increased Spell Damage (implicit)':'увеличение урона чар (собственное свойство)',
 'to all Elemental Resistances':'ко всем сопротивлениям стихиям',
 'increased Damage if you have Shocked an Enemy Recently':'увеличение урона, если вы наложили шок на врага за последние 4 с',
 'increased Effect of Shock':'увеличение эффекта шока',
 'increased Armour and Evasion (local)':'увеличение брони и уклонения этого предмета',
 'increased Energy Shield (local)':'увеличение энергощита этого предмета',
 'of Attack Damage Leeched as Life':'урона атак похищается в виде здоровья',
 'of Attack Damage Leeched as Mana':'урона атак похищается в виде маны',
 'to Fire Resistance':'к сопротивлению огню',
 'to Cold Resistance':'к сопротивлению холоду',
 'to Lightning Resistance':'к сопротивлению молнии',
 'to Chaos Resistance':'к сопротивлению хаосу',
 'chance to Shock':'шанс наложить шок',
 'increased Damage while Ignited':'увеличение урона во время поджога самого героя',
 'to Fire and Lightning Resistances':'к сопротивлениям огню и молнии',
 'increased Lightning Damage':'увеличение урона молнией',
 'increased Physical Damage (local)':'увеличение физического урона этого оружия',
 'increased Critical Strike Chance (local)':'увеличение шанса критического удара этого оружия',
 'increased Movement Speed':'увеличение скорости передвижения',
};
const flat={'maximum Life':'максимуму здоровья','maximum Mana':'максимуму маны','Accuracy Rating':'меткости','all Attributes':'всем атрибутам','Strength and Dexterity':'силе и ловкости','Intelligence':'интеллекту'};
export function uniqueModifierText(line){
 if(exact[line])return exact[line];
 let m=line.match(/^([+\d.]+)% (.+)$/);if(m&&suffix[m[2]])return `${m[1]}% ${suffix[m[2]]}`;
 m=line.match(/^\+(\d+) to (.+)$/);if(m&&flat[m[2]])return `+${m[1]} к ${flat[m[2]]}`;
 m=line.match(/^Enemies take (\d+)% increased Damage for each type of Ailment you have inflicted on them$/);if(m)return `Враги получают на ${m[1]}% увеличенный урон за каждый тип состояния, наложенного вами`;
 m=line.match(/^Adds (\d+) to (\d+) Fire Damage to Spells and Attacks$/);if(m)return `Добавляет ${m[1]}–${m[2]} урона огнём к чарам и атакам`;
 m=line.match(/^Gain (\d+)% of Physical Damage as Extra Chaos Damage$/);if(m)return `Получает ${m[1]}% физического урона в виде дополнительного урона хаосом`;
 m=line.match(/^Count as having maximum number of (endurance|frenzy|power) Charges$/);if(m)return `Считает количество зарядов ${{endurance:'выносливости',frenzy:'ярости',power:'энергии'}[m[1]]} максимальным; расходуемые заряды не создаются`;
 throw new Error('Missing unique modifier translation: '+line);
}
