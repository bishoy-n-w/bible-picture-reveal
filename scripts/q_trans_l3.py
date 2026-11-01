# -*- coding: utf-8 -*-
"""
Level 3 (Questions 201 to 300): Exact English Question Text and NKJV Verses
Keyed by 0-based index (200 to 299)
"""

import sys
import os
sys.path.append(os.path.dirname(__file__))
from build_level3_gems import L3_GEMS

L3_TRANSLATIONS = {
    200: ("How long was the famous iron bedstead of Og king of Bashan, the last of the remnant of the giants?",
          "For only Og king of Bashan remained of the remnant of the giants. Indeed his bedstead was an iron bedstead... Nine cubits is its length and four cubits its width, according to the standard cubit."),
    201: ("What was the name of the Egyptian priest of On whose daughter Asenath was given to Joseph as his wife?",
          "And Pharaoh called Joseph’s name Zaphenath-Paneah. And he gave him as a wife Asenath, the daughter of Poti-Pherah priest of On. So Joseph went out over all the land of Egypt."),
    202: ("What was the name of the very fat king of Moab who was struck down in his cool upper chamber by Ehud son of Gera?",
          "Then he brought the present to Eglon king of Moab. (Now Eglon was a very fat man.)"),
    203: ("What test word did the Gileadites demand at the Jordan crossings, which the fleeing Ephraimites mispronounced as 'Sibboleth'?",
          "that they would say to him, 'Then say, \"Shibboleth\"!' And he would say, 'Sibboleth,' for he could not pronounce it right. Then they would take him and kill him at the fords of the Jordan."),
    204: ("Who hid one hundred prophets of the LORD by fifties in caves and fed them with bread and water during Jezebel's purge?",
          "For so it was, while Jezebel massacred the prophets of the LORD, that Obadiah had taken one hundred prophets and hidden them, fifty to a cave, and had fed them with bread and water."),
    205: ("How old was King Josiah when he began his reign over Judah, initiating great religious and covenant renewals?",
          "Josiah was eight years old when he became king, and he reigned thirty-one years in Jerusalem."),
    206: ("On which mountain in the wilderness of Zin did Aaron the high priest die after being stripped of his garments?",
          "Moses stripped Aaron of his garments and put them on Eleazar his son; and Aaron died there on the top of the mountain. Then Moses and Eleazar came down from the mountain."),
    207: ("What was the mountain and summit that Moses climbed to view the Promised Land before his death, where the LORD buried him?",
          "Then Moses went up from the plains of Moab to Mount Nebo, to the top of Pisgah, which is across from Jericho. And the LORD showed him all the land... So Moses the servant of the LORD died there in the land of Moab, according to the word of the LORD. And He buried him in a valley"),
    208: ("What well did Abraham dig and make a covenant there with Abimelech, swearing an oath to each other?",
          "Therefore he called that place Beersheba, because the two of them swore an oath there."),
    209: ("What was the name of the wilderness well where the Angel of the LORD appeared to Hagar as she fled from Sarai?",
          "Therefore the well was called Beer Lahai Roi; observe, it is between Kadesh and Bered."),
    210: ("How many shekels of silver did Abraham weigh out to Ephron the Hittite for the purchase of the cave of Machpelah?",
          "And Abraham listened to Ephron; and Abraham weighed out the silver for Ephron which he had named in the hearing of the sons of Heth, four hundred shekels of silver, currency of the merchants."),
    211: ("What was the name of the mother of Aaron, Moses, and Miriam, explicitly named in Exodus and Numbers?",
          "Now Amram took for himself Jochebed, his father’s sister, as wife; and she bore him Aaron and Moses. And the years of the life of Amram were one hundred and thirty-seven."),
    212: ("What were the names of the two Hebrew midwives who feared God and refused Pharaoh's decree to kill newborn male children?",
          "Then the king of Egypt spoke to the Hebrew midwives, of whom the name of one was Shiphrah and the name of the other Puah; and he said, 'When you do the duties of a midwife for the Hebrew women... if it is a son, then you shall kill him'"),
    213: ("What was the oasis where the Israelites found twelve wells of water and seventy palm trees?",
          "Then they came to Elim, where there were twelve wells of water and seventy palm trees; so they camped there by the waters."),
    214: ("Who were the two men who held up Moses' hands until sunset so that Joshua defeated Amalek at Rephidim?",
          "But Moses’ hands became heavy; so they took a stone and put it under him, and he sat on it. And Aaron and Hur supported his hands, one on one side, and the other on the other side; and his hands were steady until the going down of the sun."),
    215: ("What did Moses name the altar he built after the victory over Amalek at Rephidim, meaning 'The-LORD-Is-My-Banner'?",
          "And Moses built an altar and called its name, The-LORD-Is-My-Banner (Yahweh Nissi);"),
    216: ("What were the names of the two master craftsmen filled with the Spirit of God to construct the Tabernacle and its furnishings?",
          "'See, I have called by name Bezalel the son of Uri, the son of Hur, of the tribe of Judah... And I, indeed I, have appointed with him Aholiab the son of Ahisamach, of the tribe of Dan; and I have put wisdom in the hearts of all who are gifted artisans'"),
    217: ("What were the names of the two sons of Aaron who offered profane fire before the LORD and died before the LORD?",
          "Then Nadab and Abihu, the sons of Aaron, each took his censer and put fire in it, put incense on it, and offered profane fire before the LORD, which He had not commanded them. So fire went out from the LORD and devoured them, and they died before the LORD."),
    218: ("Whose rebellion caused the earth to open its mouth and swallow them alive with their households and goods?",
          "and the earth opened its mouth and swallowed them up, with their households and all the men with Korah, with all their goods. So they and all those with them went down alive into the pit; the earth closed over them, and they perished from among the assembly."),
    219: ("What miraculous signs appeared on Aaron's rod in the Tabernacle of Witness confirming the Levitical priesthood?",
          "Now it came to pass on the next day that Moses went into the tabernacle of witness, and behold, the rod of Aaron, of the house of Levi, had sprouted and put forth buds, had produced blossoms and yielded ripe almonds."),
    220: ("Which king of Judah was struck with leprosy on his forehead for presuming to burn incense in the holy temple?",
          "Then Uzziah became furious; and he had a censer in his hand to burn incense. And while he was angry with the priests, leprosy broke out on his forehead, before the priests in the house of the LORD, beside the incense altar."),
    221: ("What tower in Jerusalem collapsed, killing eighteen people, which Jesus cited when warning all to repent?",
          "'Or those eighteen on whom the tower in Siloam fell and killed them, do you think that they were worse sinners than all other men who dwelt in Jerusalem? I tell you, no; but unless you repent you will all likewise perish.'"),
    222: ("Who was the chief priest of Nob slaughtered alongside eighty-five priests wearing linen ephods by Doeg the Edomite?",
          "So the king said to Doeg, 'You turn and kill the priests!' So Doeg the Edomite turned and struck the priests, and killed on that day eighty-five men who wore a linen ephod. Also Nob, the city of the priests, he struck with the edge of the sword"),
    223: ("Who was the only son of Ahimelech who escaped the massacre of Nob and fled to David with the priestly ephod?",
          "Now one of the sons of Ahimelech the son of Ahitub, named Abiathar, escaped and fled after David. And Abiathar told David that Saul had killed the LORD’s priests."),
    224: ("Which two mountains in Deuteronomy were designated for the proclamation of blessings and curses?",
          "'Now it shall be, when the LORD your God has brought you into the land which you go to possess, that you shall put the blessing on Mount Gerizim and the curse on Mount Ebal.'"),
    225: ("Which judge was left-handed from the tribe of Benjamin who made a double-edged dagger one cubit long to assassinate Eglon?",
          "But when the children of Israel cried out to the LORD, the LORD raised up a deliverer for them: Ehud the son of Gera, the Benjamite, a left-handed man. By him the children of Israel sent tribute to Eglon king of Moab. Now Ehud made for himself a dagger (it was double-edged and a cubit in length)"),
    226: ("How many trained men born in Abraham's household went with him to rescue his nephew Lot from the four kings?",
          "Now when Abram heard that his brother was taken captive, he armed his three hundred and eighteen trained servants who were born in his own house, and went in pursuit as far as Dan."),
    227: ("Who was the king of Salem and priest of God Most High who brought out bread and wine and blessed Abraham?",
          "Then Melchizedek king of Salem brought out bread and wine; he was the priest of God Most High. And he blessed him and said: 'Blessed be Abram of God Most High, Possessor of heaven and earth;'"),
    228: ("How many years did Sarah live, being the only woman whose complete age at death is recorded in the Torah?",
          "Sarah lived one hundred and twenty-seven years; these were the years of the life of Sarah. So Sarah died in Kirjath Arba (that is, Hebron) in the land of Canaan"),
    229: ("Who was Abraham's chief servant and manager of his household, sent to Haran to find a wife for Isaac?",
          "But Abram said, 'Lord GOD, what will You give me, seeing I go childless, and the heir of my house is Eliezer of Damascus?'")
}

# Populate the 70 replacement questions (indices 230 to 299)
for idx, gem in enumerate(L3_GEMS):
    actual_idx = 230 + idx
    q_ar, q_en, correct_tuple, distractors_list, ref_ar, ref_en, verse_ar, verse_en = gem
    L3_TRANSLATIONS[actual_idx] = (q_en, verse_en)

print(f"Loaded {len(L3_TRANSLATIONS)} verified L3 translations.")
