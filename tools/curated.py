"""Hand-written parts of the briefing: the 60-second list, roadmap, class notes, labels and fixes to the research.
Edit here, then run: python tools/build_data.py"""

HERO_CMD = "whimsy --brief forever --raid-night 2026-12-09"
LEDE = ("Everything Blizzard has said about WoW Forever, every change from Classic that matters to a raid, "
        "the new tier gear, and a news wire that refreshes itself. Built for raid night: 9 December.")

COUNTDOWNS = [
    {"label": "Raids open", "sub": "9 Dec, time TBA · counting to midnight PST", "at": "2026-12-09T08:00:00Z", "i": "achievement_boss_onyxia"},
    {"label": "Since launch", "sub": "Live since 4 Nov, 3 p.m. PST", "at": "2026-11-04T23:00:00Z", "since": True, "i": "spell_arcane_portaldalaran"},
    {"label": "Auction House changes", "sub": "17 Nov maintenance", "at": "2026-11-17T15:00:00Z", "i": "inv_misc_coin_01"},
]

CLASSES = {
    "warrior": {"n": "Warrior", "c": "#C69B6D", "i": "classicon_warrior",
                "note": "Rage is normalised and tank threat went up to cover the loss of Salvation. Battle Shout now reaches the whole raid."},
    "paladin": {"n": "Paladin", "c": "#F48CBA", "i": "classicon_paladin",
                "note": "Paladins can tank now. Blessings of Salvation and Light are gone, and only the resistance auras reach the whole raid."},
    "hunter": {"n": "Hunter", "c": "#AAD372", "i": "classicon_hunter",
               "note": "Aimed Shot is baseline, Auto Shot needs you standing still, and pets no longer take player buffs."},
    "rogue": {"n": "Rogue", "c": "#FFF468", "i": "classicon_rogue",
              "note": "Mutilate and new poisons arrive. Expose Armor now equals five Sunders instead of blocking them."},
    "priest": {"n": "Priest", "c": "#FFFFFF", "i": "classicon_priest",
               "note": "Every priest gets Fear Ward, Devouring Plague, Divine Spirit and Shadow Word: Death. Shadow Weaving now helps only you."},
    "shaman": {"n": "Shaman", "c": "#0070DD", "i": "classicon_shaman",
               "note": "Windfury and Flametongue are raid-wide totems, Lava Burst is gone, and Enhancement was reworked just before raids."},
    "mage": {"n": "Mage", "c": "#3FC7EB", "i": "classicon_mage",
             "note": "Frostfire Bolt, Arcane Blast and Ice Lance join the kit. Improved Scorch, Winter's Chill and Ignite now help only you."},
    "warlock": {"n": "Warlock", "c": "#8788EE", "i": "classicon_warlock",
                "note": "Curse of Shadow is folded into Curse of the Elements, Life Tap scales with Spirit, and pets got sturdier."},
    "druid": {"n": "Druid", "c": "#FF7C0A", "i": "classicon_druid",
              "note": "Ferals can drink potions and hold real threat, Restoration gets Wild Growth, and Moonkin Aura no longer stacks with Leader of the Pack."},
}

AREAS = {
    "raids": {"n": "Raids", "i": "achievement_boss_onyxia"},
    "buffs": {"n": "Buffs & debuffs", "i": "spell_holy_devotionaura"},
    "world": {"n": "World buffs", "i": "inv_misc_head_dragon_01"},
    "stats": {"n": "Stats & hit", "i": "ability_hunter_snipershot"},
    "classes": {"n": "Classes", "i": "achievement_character_human_male"},
    "gear": {"n": "Gear", "i": "inv_chest_plate16"},
    "tier-sets": {"n": "Tier sets", "i": "inv_helmet_09"},
    "loot": {"n": "Loot", "i": "inv_box_01"},
    "professions": {"n": "Professions", "i": "trade_blacksmithing"},
    "economy": {"n": "Economy", "i": "inv_misc_coin_01"},
    "pvp": {"n": "PvP", "i": "inv_bannerpvp_02"},
    "qol": {"n": "UI & add-ons", "i": "inv_misc_enggizmos_20"},
    "leveling": {"n": "Leveling", "i": "inv_misc_book_11"},
    "roadmap": {"n": "Roadmap", "i": "inv_misc_map_01"},
}

TOPICS = {
    "launch": {"n": "Launch", "i": "spell_arcane_portaldalaran"},
    "raids": {"n": "Raids", "i": "achievement_boss_onyxia"},
    "classes": {"n": "Classes", "i": "achievement_character_human_male"},
    "gear": {"n": "Gear", "i": "inv_chest_plate16"},
    "leveling": {"n": "Leveling & dungeons", "i": "inv_misc_book_11"},
    "hotfix": {"n": "Hotfixes", "i": "inv_misc_wrench_01"},
    "realms": {"n": "Rulesets & realms", "i": "achievement_guildperk_everybodysfriend"},
    "economy": {"n": "Economy", "i": "inv_misc_coin_01"},
    "pvp": {"n": "PvP", "i": "inv_bannerpvp_01"},
    "professions": {"n": "Professions & camping", "i": "trade_blacksmithing"},
    "ui-addons": {"n": "UI & add-ons", "i": "inv_misc_enggizmos_20"},
    "roadmap": {"n": "Roadmap", "i": "inv_misc_pocketwatch_01"},
    "business": {"n": "Editions & store", "i": "inv_misc_coin_17"},
    "lore": {"n": "Story & media", "i": "inv_misc_book_07"},
    "other": {"n": "Other", "i": "inv_scroll_03"},
}

# official.json 'other' items, reclassified by words in the title
RETOPIC = [
    (("xp", "dungeon", "leveling", "level cap", "excavation"), "leveling"),
    (("story", "podcast", "panel", "lore", "short", "photos", "escape", "poster", "discord"), "lore"),
    (("ion hazzikostas", "pillar"), "roadmap"),
]

# Change-ledger icons, by words in the title (first match wins); otherwise the class or area icon
CHANGE_ICONS = [
    ("salvation", "spell_holy_sealofsalvation"), ("world buffs", "inv_misc_head_dragon_01"),
    ("windfury", "spell_nature_windfury"), ("shadow weaving", "spell_shadow_blackplague"),
    ("curse of shadow", "spell_shadow_chilltouch"), ("battle shout", "ability_warrior_battleshout"),
    ("shouts, auras", "ability_warrior_battleshout"), ("hit", "ability_hunter_snipershot"),
    ("hidden", "inv_misc_questionmark"), ("crafted tier", "trade_blacksmithing"),
    ("legendary", "inv_staff_13"), ("resistance gear", "spell_fire_fire"),
    ("add-ons", "inv_misc_enggizmos_20"), ("talent", "inv_misc_book_11"),
    ("potions", "inv_potion_62"), ("flask", "inv_potion_97"), ("onyxia", "inv_misc_head_dragon_black"),
    ("hyjal", "spell_nature_regeneration"), ("barrow", "inv_misc_head_dwarf_01"),
    ("pvp", "inv_bannerpvp_02"), ("riding", "ability_mount_ridinghorse"), ("auction", "inv_misc_coin_02"),
    ("gold", "inv_misc_coin_02"), ("expose armor", "ability_warrior_defensivestance"),
    ("pets", "ability_hunter_pet_bear"), ("blessing", "spell_holy_sealofmight"),
    ("feral", "ability_druid_catform"), ("restoration", "spell_nature_healingwavegreater"),
    ("balance", "spell_nature_starfall"), ("priest", "spell_holy_wordfortitude"),
    ("mage", "spell_frost_frostbolt02"), ("warlock", "spell_shadow_twilight"),
    ("rogue", "ability_rogue_ambush"), ("tank", "ability_warrior_defensivestance"),
    ("loot", "inv_box_01"), ("dungeon", "inv_misc_key_14"), ("camp", "inv_misc_bag_10"),
    ("roadmap", "inv_misc_map_01"), ("ptr", "inv_misc_spyglass_03"),
]

# Fixes to research rows, by index in data/src/changes.json (reconciled against Blizzard's own posts)
CHANGE_FIXES = {
    10: {"more": "We wrote a whole site on why resistance gear mattered in Classic and what Forever changes: see the Resistance Ledger.",
         "link": {"name": "The Resistance Ledger: Forever", "url": "https://zmarotrix.github.io/resistance-ledger/#forever"}},
    11: {"title": "First legendary revealed: Taldramir, the Whispering Wood",
         "forever": "Blizzard has shown Forever's first legendary, Taldramir, the Whispering Wood. How to get it isn't revealed; fan sites tie it to Hyjal Summit and a later legendary questline.",
         "add_sources": [{"name": "Blizzard: Forging Forever", "url": "https://news.blizzard.com/en-us/article/24317865/wow-forever-watch-forging-forever"}]},
    78: {"title": "Raid epics bind to the looter; the loot method isn't announced",
         "forever": "Blizzard says raid epics bind to whoever loots them. Whether raids use master, group or personal loot hasn't been announced.",
         "add_sources": [{"name": "Blizzard: Deep Dive panel recap", "url": "https://news.blizzard.com/en-us/article/24303313/world-of-warcraft-forever-deep-dive-panel-recap"}]},
    94: {"title": "Dungeon XP: 60% of Classic Era, and none when boosted",
         "forever": "Dungeon kill XP went from 40% to 60% of Classic Era on 8 Nov. Since 14 Nov a kill gives no XP if anyone in the group is more than 12 levels above the enemy.",
         "impact": "Recruits level a bit faster in dungeons, but boosting alts through dungeons no longer works.",
         "confidence": "official", "severity": "notable",
         "add_sources": [{"name": "Blizzard forums: 60% of Classic Era", "url": "https://us.forums.blizzard.com/en/wow/t/the-majority-wants-increased-dungeon-xp/2406555/254"},
                         {"name": "Blizzard forums: 12-level gap", "url": "https://us.forums.blizzard.com/en/wow/t/player-level-dungeon-xp-adjustment-november-14/2416343/1"}]},
    96: {"forever": "Blizzard's roadmap lists more raids, dungeons, PvP, Hardcore and a revamped iconic raid. Fan sites add dates: Hardcore this winter, then spring 2027 (2 raids, 2 dungeons, a legendary questline) and summer 2027.",
         "confidence": "community"},
}

MUST = [
    {"t": "Raids open 9 December", "i": "achievement_boss_onyxia", "ref": 0,
     "d": "Barrow Deeps (10 players, 8 bosses), Hyjal Summit (20 players, 13 bosses) and Onyxia's Lair (40). All three reset weekly, Onyxia included."},
    {"t": "Build a roster around 20, not 40", "i": "achievement_guildperk_everybodysfriend", "ref": 8,
     "d": "Raid sizes are fixed at 10 and 20, and Blizzard plans two raids per tier. Most of our loot will come from a 20 and two 10s."},
    {"t": "Blessing of Salvation is gone", "i": "spell_holy_sealofsalvation", "ref": 15,
     "d": "Tanks got more threat to make up for it, but DPS now have to watch their own threat meters."},
    {"t": "World buffs don't work in raids", "i": "inv_misc_head_dragon_01", "ref": 30,
     "d": "The game's tooltips say world buffs and Darkmoon fortunes do nothing in raids. No buff farming, no raid logging."},
    {"t": "Buffs reach the whole raid; debuffs help only you", "i": "ability_warrior_battleshout", "ref": 13,
     "d": "Battle Shout, Trueshot, key totems and resistance auras cover all 20 or 40 players. Shadow Weaving, Winter's Chill and Improved Scorch now only help the caster who applies them."},
    {"t": "Hit is one stat with new caps", "i": "ability_hunter_snipershot", "ref": 33,
     "d": "Reported caps against bosses are about 8% for melee and 17% for spells. Hit on gear is a flat percentage and rare below level 50."},
    {"t": "Nobody knows the loot yet", "i": "inv_misc_questionmark", "ref": 63,
     "d": "Item stats stay hidden until someone on your realm loots the item, raid gear included. There's no best-in-slot list. Record what drops."},
    {"t": "Tier 1 is brand new, and four slots can be crafted", "i": "inv_helmet_09", "ref": 67,
     "d": "Each class gets new sets per role. Shoulders, hands, legs and feet can be crafted, but only from essence you get by disenchanting new raid loot."},
    {"t": "Classic guides and sims don't apply", "i": "inv_misc_book_11", "ref": 43,
     "d": "Talent trees were rebuilt, every class got new tools, and class damage and mob health were both raised."},
    {"t": "Raid add-ons may be limited", "i": "inv_misc_enggizmos_20", "ref": 91,
     "d": "Reports say combat add-ons face retail-style limits. Blizzard ships its own Cooldown Manager and Damage Meter, so learn those."},
    {"t": "Skip the resistance farm (mostly)", "i": "spell_fire_fire", "ref": 10,
     "d": "Guides say the opening raids don't need resistance sets. Keep some fire resistance for Onyxia."},
]

ROAD = [
    {"date": "2026-09-12", "when": "12 Sep 2026", "t": "Announced at BlizzCon", "d": "Forever is revealed as a permanent third version of WoW, set in its first year.", "i": ["inv_misc_ticket_tarot_madness"],
     "src": [{"name": "Blizzard", "url": "https://news.blizzard.com/en-us/article/24303862/world-of-warcraft-forever-whats-next-panel-recap"}]},
    {"date": "2026-09-17", "when": "17 Sep", "t": "Beta opens", "d": "Level cap 20 and two dungeons at first, raised over October.", "i": ["inv_misc_spyglass_03"]},
    {"date": "2026-10-21", "when": "21 Oct", "t": "Stress test", "d": "One day on the production hardware, open to any WoW account.", "i": ["inv_misc_wrench_01"]},
    {"date": "2026-10-27", "when": "27 Oct", "t": "Name reservation", "d": "Three characters per account, until 3 November.", "i": ["inv_misc_note_01"]},
    {"date": "2026-11-04", "when": "4 Nov", "t": "Launch", "d": "Live in every region at 3 p.m. PST.", "i": ["spell_arcane_portaldalaran"]},
    {"date": "2026-11-17", "when": "17 Nov", "t": "Auction House changes", "d": "Moved to this maintenance after launch week.", "i": ["inv_misc_coin_01"]},
    {"date": "2026-12-09", "when": "9 Dec", "t": "Raids open", "d": "Barrow Deeps, Hyjal Summit and Onyxia's Lair, weekly resets.", "i": ["inv_misc_head_dwarf_01", "spell_nature_regeneration", "inv_misc_head_dragon_black"],
     "src": [{"name": "Blizzard raid overview", "url": "https://news.blizzard.com/en-gb/article/24303009/world-of-warcraft-forever-raid-overviewlocations-raid-sizes-and-attunement"}]},
    {"date": None, "when": "Winter 2026–27", "t": "Hardcore", "d": "Blizzard confirms Hardcore after launch. Fan sites say this winter.", "i": ["spell_holy_resurrection"]},
    {"date": None, "when": "Early 2027", "t": "Skyborne visual update", "d": "Updated Skyborne models and druid forms.", "i": ["spell_nature_polymorph"],
     "src": [{"name": "Blizzard", "url": "https://news.blizzard.com/en-us/article/24303862/world-of-warcraft-forever-whats-next-panel-recap"}]},
    {"date": None, "when": "Spring 2027 (reported)", "t": "Next raid tier", "d": "Reported: two raids, two dungeons and a legendary questline.", "i": ["achievement_boss_ragnaros"]},
    {"date": None, "when": "Summer 2027 (reported)", "t": "A revamped iconic raid", "d": "Blizzard has promised a revamped iconic raid. Fan sites put it in summer.", "i": ["inv_hammer_unique_sulfuras"]},
]
ROAD_TLDR = ("We're past launch and in the leveling month. Raids open on 9 December. After that Blizzard plans Hardcore, "
             "a visual update for Skyborne, and new raids in 2027. Dates marked 'reported' come from fan sites, not Blizzard.")

ACH = {
    "hello": {"n": "Logged In", "d": "Opened the Forever briefing.", "i": "spell_arcane_portaldalaran"},
    "must": {"n": "Briefed", "d": "Read every must-know.", "i": "inv_misc_note_01"},
    "class": {"n": "Know Thyself", "d": "Picked your class.", "i": "achievement_character_human_male"},
    "first": {"n": "Curious", "d": "Opened your first change.", "i": "inv_misc_spyglass_03"},
    "ten": {"n": "Studious", "d": "Opened ten changes.", "i": "inv_misc_book_09"},
    "majors": {"n": "Raid Leader Material", "d": "Opened every major change.", "i": "ability_warrior_battleshout"},
    "gear": {"n": "Window Shopper", "d": "Looked through a tier set.", "i": "inv_helmet_09"},
    "archive": {"n": "Archivist", "d": "Dug into older Blizzard statements.", "i": "inv_scroll_03"},
    "wire": {"n": "Plugged In", "d": "Opened a story from The Wire.", "i": "inv_letter_15"},
    "end": {"n": "Terminal Reached", "d": "Made it to the very end.", "i": "spell_nature_timestop"},
    "wisp": {"n": "Wisp Whisperer", "d": "Poked the wisp five times. It liked it.", "i": "spell_nature_starfall"},
    "secret": {"n": "sudo whimsy", "d": "Found the secret. Type it again anytime.", "i": "inv_misc_gift_01"},
}

# the wisp: a small guide in the corner. Lowercase, terminal voice, a little smug.
WISP = {
    "hello": "> hi. i'm the wisp. i live in the corner and know things about forever. poke me.",
    "secret": "> sudo whimsy: permission granted. ✦",
    "fullset": "> full set! you look incredible. stats still hidden, but incredible.",
    "sections": {
        "must": "> start here. eleven things, sixty seconds. i timed it.",
        "road": "> raids open 9 december. i've been counting. obsessively.",
        "you": "> pick your class. i won't tell anyone if it's a hunter.",
        "changes": "> how classic did it, then how forever does it. that's the whole trick.",
        "gear": "> click the armour pieces. the set bonuses glow. very satisfying.",
        "said": "> everything blizzard said, with receipts. every line links to the source.",
        "wire": "> fresh news every three hours. gold means blizzard said it.",
        "sources": "> every claim links somewhere. trust, but verify.",
    },
    "poke": [
        "> salvation is gone. watch your own threat, dps. i believe in you.",
        "> world buffs don't work in raids. sleep in on raid day.",
        "> nobody knows the loot yet. write down what drops. be the archive.",
        "> battle shout reaches all twenty of you now. hug a warrior.",
        "> hit is one stat now. about 8% melee, 17% spells against bosses.",
        "> onyxia still wants some fire resistance. she's old-fashioned.",
        "> tip: try typing a certain word anywhere on this page. it's the guild's middle name.",
        "> i'm made of 4% arcane, 96% vibes.",
        "> ok, that's enough poking. (it isn't. keep going.)",
    ],
    "sky": ["> ✦ wheee", "> you poked the sky. it sparkled back.", "> careful, that's dalaran's good sky."],
}

# Gear: which class each set name belongs to, and armour type for slot icons
SET_CLASS = [("glory", "warrior"), ("conviction", "priest"), ("grovekeeper", "druid"), ("spiritcaller", "shaman"),
             ("manaflare", "mage"), ("wildstalker", "hunter"), ("justice", "paladin"), ("grimstitch", "rogue"),
             ("demonheart", "warlock")]
ARMOR = {"warrior": "plate", "paladin": "plate", "hunter": "mail", "shaman": "mail", "rogue": "leather",
         "druid": "leather", "priest": "cloth", "mage": "cloth", "warlock": "cloth"}
SLOT_ICONS = {
    "plate": ["inv_helmet_09", "inv_shoulder_15", "inv_chest_plate16", "inv_gauntlets_10", "inv_pants_04", "inv_boots_plate_06"],
    "mail": ["inv_helmet_05", "inv_shoulder_10", "inv_chest_chain_15", "inv_gauntlets_11", "inv_pants_mail_03", "inv_boots_chain_08"],
    "leather": ["inv_helmet_41", "inv_shoulder_07", "inv_chest_leather_08", "inv_gauntlets_21", "inv_pants_leather_09", "inv_boots_08"],
    "cloth": ["inv_crown_01", "inv_shoulder_02", "inv_chest_cloth_49", "inv_gauntlets_14", "inv_pants_cloth_15", "inv_boots_cloth_03"],
}
SLOTS = ["Head", "Shoulder", "Chest", "Hands", "Legs", "Feet"]
REMOVED_ABILITIES = ["Lava Burst", "Berserk", "Tiger's Fury", "Binding Heal"]

# icons + groups for the non-set items, by words in the name (first match wins)
ITEM_ICONS = [
    ("malleable", "spell_nature_regeneration", "Reagents & keys", "rare"), ("seed pod", "inv_misc_flower_02", "Reagents & keys", "common"),
    ("drakefire", "inv_jewelry_talisman_11", "Reagents & keys", "rare"), ("natural flasks", "inv_misc_herb_19", "Consumables", "common"),
    ("titans", "inv_potion_62", "Consumables", "common"), ("supreme power", "inv_potion_41", "Consumables", "common"),
    ("distilled wisdom", "inv_potion_97", "Consumables", "common"), ("chromatic", "inv_potion_48", "Consumables", "common"),
    ("armor kit", "inv_misc_armorkit_17", "Consumables", "common"), ("necklace enchant", "inv_jewelry_necklace_07", "Consumables", "common"),
    ("pvp rare", "inv_bannerpvp_01", "PvP", "rare"), ("onyxia hide", "inv_misc_bag_enchantedrunecloth", "Changed items", "uncommon"),
    ("bag", "inv_misc_bag_04", "Changed items", "common"), ("pack", "inv_misc_bag_04", "Changed items", "common"),
    ("shovel", "inv_misc_shovel_01", "Changed items", "rare"), ("tidal", "inv_misc_gem_pearl_04", "Changed items", "rare"),
    ("chapeau", "inv_crown_01", "Changed items", "rare"), ("cutlery", "inv_weapon_shortblade_25", "Changed items", "rare"),
    ("wand", "inv_wand_04", "Changed items", "uncommon"), ("rage of the storm", "inv_hammer_20", "Changed items", "rare"),
    ("bracers", "inv_bracer_07", "Changed items", "uncommon"), ("cloak", "inv_misc_cape_16", "Changed items", "uncommon"),
    ("belt", "inv_belt_15", "Changed items", "uncommon"), ("hood", "inv_helmet_05", "Changed items", "uncommon"),
    ("helm", "inv_helmet_08", "Changed items", "rare"), ("gloves", "inv_gauntlets_21", "Changed items", "uncommon"),
]
DUNGEON_SET_ICON = "inv_helmet_08"
