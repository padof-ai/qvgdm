/* Configuration proposée au premier lancement (modifiable dans Paramètres) */
const DEFAULT_CONFIG = {
 "title": "Qui veut gagner des applaudissements ? Spécial Nantes",
 "subtitle": "Spécial Nantes",
 "tagline": "Qui connaît le mieux Nantes ?",
 "host": {
  "first": "Pierre-Alain",
  "last": "FOUCAULT",
  "avatar": {
   "kind": "gen",
   "seed": 4242
  }
 },
 "timer": 30,
 "basePoints": 3,
 "jokerCost": 1,
 "jokers": {
  "fifty": true,
  "public": true,
  "phone": false
 },
 "footer": "Un très beau lot attend le grand gagnant !",
 "questions": [
  {
   "id": "nq1",
   "label": "1. Le fleuve",
   "text": "Quel fleuve traverse Nantes ?",
   "answers": [
    "La Seine",
    "La Loire",
    "La Garonne",
    "Le Rhône"
   ],
   "correct": 1,
   "difficulty": 1,
   "points": 2,
   "jokerCost": null,
   "note": "La Loire, plus long fleuve de France (environ 1 000 km), se jette dans l'Atlantique à Saint-Nazaire, à une cinquantaine de kilomètres de Nantes.",
   "imgMode": "none",
   "img": null,
   "aImgs": [
    null,
    null,
    null,
    null
   ]
  },
  {
   "id": "nq2",
   "label": "2. L'écrivain",
   "text": "Quel écrivain est né à Nantes en 1828 ?",
   "answers": [
    "Victor Hugo",
    "Alexandre Dumas",
    "Jules Verne",
    "Gustave Flaubert"
   ],
   "correct": 2,
   "difficulty": 1,
   "points": 2,
   "jokerCost": null,
   "note": "Jules Verne est né le 8 février 1828 sur l'île Feydeau. Le musée Jules Verne, sur la butte Sainte-Anne, domine la Loire et les anciens chantiers navals.",
   "imgMode": "none",
   "img": null,
   "aImgs": [
    null,
    null,
    null,
    null
   ]
  },
  {
   "id": "nq3",
   "label": "3. Le biscuit",
   "text": "Le célèbre biscuit LU est né à Nantes. Que signifient ces deux lettres ?",
   "answers": [
    "Lefèvre-Utile",
    "Loire Unie",
    "Les Usines",
    "Lait Uniquement"
   ],
   "correct": 0,
   "difficulty": 1,
   "points": 2,
   "jokerCost": null,
   "note": "LU vient de Lefèvre-Utile, du nom du couple fondateur, Jean-Romain Lefèvre et Pauline-Isabelle Utile. Leur fils Louis a créé le Petit Beurre en 1886. L'ancienne usine abrite aujourd'hui le Lieu Unique, scène nationale.",
   "imgMode": "none",
   "img": null,
   "aImgs": [
    null,
    null,
    null,
    null
   ]
  },
  {
   "id": "nq4",
   "label": "4. Les Machines",
   "text": "Quel animal géant des Machines de l'île peut-on chevaucher à Nantes ?",
   "answers": [
    "Un dragon",
    "Une baleine",
    "Une girafe",
    "Un éléphant"
   ],
   "correct": 3,
   "difficulty": 1,
   "points": 2,
   "jokerCost": null,
   "note": "Le Grand Éléphant a transporté environ 1,5 million de passagers depuis 2007. Attention, il est en maintenance jusqu'au 26 février 2027 : il reprend du service le 27 février.",
   "imgMode": "none",
   "img": null,
   "aImgs": [
    null,
    null,
    null,
    null
   ]
  },
  {
   "id": "nq5",
   "label": "5. Le football",
   "text": "Quel est le surnom des joueurs du FC Nantes ?",
   "answers": [
    "Les Verts",
    "Les Merlus",
    "Les Dogues",
    "Les Canaris"
   ],
   "correct": 3,
   "difficulty": 2,
   "points": 2,
   "jokerCost": null,
   "note": "Les Canaris, en référence au maillot jaune. Les Verts, c'est Saint-Étienne, les Merlus Lorient, les Dogues Lille.",
   "imgMode": "none",
   "img": null,
   "aImgs": [
    null,
    null,
    null,
    null
   ]
  },
  {
   "id": "nq6",
   "label": "6. Le vin",
   "text": "Quel vin blanc est produit dans le vignoble nantais ?",
   "answers": [
    "Le Chablis",
    "Le Sancerre",
    "Le Muscadet",
    "Le Riesling"
   ],
   "correct": 2,
   "difficulty": 2,
   "points": 3,
   "jokerCost": null,
   "note": "Le Muscadet est produit autour de Nantes, notamment en Sèvre-et-Maine. Il accompagne traditionnellement les huîtres et les fruits de mer.",
   "imgMode": "none",
   "img": null,
   "aImgs": [
    null,
    null,
    null,
    null
   ]
  },
  {
   "id": "nq7",
   "label": "7. La ligne au sol",
   "text": "De quelle couleur est la ligne peinte au sol qui guide les visiteurs du Voyage à Nantes ?",
   "answers": [
    "Rouge",
    "Bleue",
    "Jaune",
    "Verte"
   ],
   "correct": 3,
   "difficulty": 2,
   "points": 3,
   "jokerCost": null,
   "note": "La ligne verte relie une soixantaine d'étapes artistiques et patrimoniales sur une vingtaine de kilomètres. Idéal pour visiter la ville pendant votre séjour !",
   "imgMode": "none",
   "img": null,
   "aImgs": [
    null,
    null,
    null,
    null
   ]
  },
  {
   "id": "nq8",
   "label": "8. L'édit",
   "text": "Quel roi a signé l'édit de Nantes en 1598 ?",
   "answers": [
    "Henri IV",
    "Louis XIV",
    "François Ier",
    "Louis XIII"
   ],
   "correct": 0,
   "difficulty": 2,
   "points": 3,
   "jokerCost": null,
   "note": "Henri IV signe l'édit de Nantes en 1598 pour mettre fin aux guerres de Religion. Louis XIV le révoquera en 1685 (édit de Fontainebleau).",
   "imgMode": "none",
   "img": null,
   "aImgs": [
    null,
    null,
    null,
    null
   ]
  },
  {
   "id": "nq9",
   "label": "9. Le gâteau",
   "text": "Quel alcool parfume le gâteau nantais ?",
   "answers": [
    "Le calvados",
    "Le cognac",
    "Le rhum",
    "Le kirsch"
   ],
   "correct": 2,
   "difficulty": 2,
   "points": 3,
   "jokerCost": null,
   "note": "Le rhum rappelle le passé portuaire de Nantes et ses échanges avec les Antilles. Le gâteau nantais associe amandes, beurre et rhum, sous un glaçage blanc.",
   "imgMode": "none",
   "img": null,
   "aImgs": [
    null,
    null,
    null,
    null
   ]
  },
  {
   "id": "nq10",
   "label": "10. La duchesse",
   "text": "Quelle duchesse, deux fois reine de France, est née au château de Nantes en 1477 ?",
   "answers": [
    "Aliénor d'Aquitaine",
    "Anne de Bretagne",
    "Catherine de Médicis",
    "Marie Stuart"
   ],
   "correct": 1,
   "difficulty": 3,
   "points": 4,
   "jokerCost": null,
   "note": "Anne de Bretagne naît le 25 janvier 1477 au château des ducs de Bretagne. Épouse de Charles VIII puis de Louis XII, elle a été deux fois reine de France.",
   "imgMode": "none",
   "img": null,
   "aImgs": [
    null,
    null,
    null,
    null
   ]
  },
  {
   "id": "nq11",
   "label": "11. La rivière",
   "text": "Quelle rivière, qui rejoint la Loire à Nantes, François Ier aurait qualifiée de « plus belle rivière de France » ?",
   "answers": [
    "La Sèvre nantaise",
    "La Vilaine",
    "La Maine",
    "L'Erdre"
   ],
   "correct": 3,
   "difficulty": 3,
   "points": 4,
   "jokerCost": null,
   "note": "L'Erdre, bordée de châteaux et de « folies », se parcourt en bateau depuis le centre de Nantes. Elle rejoint la Loire en passant sous la ville par le canal Saint-Félix.",
   "imgMode": "none",
   "img": null,
   "aImgs": [
    null,
    null,
    null,
    null
   ]
  },
  {
   "id": "nq12",
   "label": "12. La capitale verte",
   "text": "En quelle année Nantes a-t-elle été élue « Capitale verte de l'Europe » ?",
   "answers": [
    "2008",
    "2013",
    "2019",
    "2024"
   ],
   "correct": 1,
   "difficulty": 3,
   "points": 4,
   "jokerCost": null,
   "note": "Nantes a été Capitale verte de l'Europe en 2013, après Stockholm, Hambourg et Vitoria-Gasteiz. La ville compte de nombreux parcs, dont le Jardin des plantes, face à la gare.",
   "imgMode": "none",
   "img": null,
   "aImgs": [
    null,
    null,
    null,
    null
   ]
  },
  {
   "id": "nq13",
   "label": "13. L'ancien nom",
   "text": "Avant 1957, comment s'appelait le département de la Loire-Atlantique ?",
   "answers": [
    "Loire-Inférieure",
    "Basse-Loire",
    "Loire-Maritime",
    "Loire-Océane"
   ],
   "correct": 0,
   "difficulty": 4,
   "points": 5,
   "jokerCost": null,
   "note": "Le département s'appelait la Loire-Inférieure jusqu'en mars 1957. Comme d'autres départements « inférieurs » (Seine-Inférieure, Charente-Inférieure), il a changé de nom jugé peu flatteur.",
   "imgMode": "none",
   "img": null,
   "aImgs": [
    null,
    null,
    null,
    null
   ]
  },
  {
   "id": "nq14",
   "label": "14. Le passage",
   "text": "En quelle année a été achevé le passage Pommeraye, galerie marchande emblématique de Nantes ?",
   "answers": [
    "1789",
    "1843",
    "1889",
    "1925"
   ],
   "correct": 1,
   "difficulty": 4,
   "points": 5,
   "jokerCost": null,
   "note": "Le passage Pommeraye, achevé en 1843, porte le nom de son promoteur, Louis Pommeraye. Ses escaliers et ses statues ont servi de décor à plusieurs films, dont « Lola » de Jacques Demy.",
   "imgMode": "none",
   "img": null,
   "aImgs": [
    null,
    null,
    null,
    null
   ]
  },
  {
   "id": "nq15",
   "label": "15. Le tramway",
   "text": "En 1985, Nantes est devenue la première ville de France à…",
   "answers": [
    "Inaugurer un métro automatique",
    "Créer des vélos en libre-service",
    "Réintroduire un tramway moderne",
    "Rendre son centre-ville piéton"
   ],
   "correct": 2,
   "difficulty": 4,
   "points": 5,
   "jokerCost": null,
   "note": "Le 7 janvier 1985, Nantes remet en service un tramway « moderne », une première en France, qui a lancé la renaissance du tram dans tout le pays. Le réseau compte aujourd'hui 3 lignes.",
   "imgMode": "none",
   "img": null,
   "aImgs": [
    null,
    null,
    null,
    null
   ]
  }
 ],
 "revealMode": "manual",
 "suspenseSec": 6,
 "autoClose": true,
 "jokerScope": "game",
 "emblem": {
  "top": "QUI VEUT GAGNER DES",
  "center": "APPLAUDISSEMENTS ?",
  "bottom": "SPÉCIAL NANTES",
  "logo": {
   "kind": "emoji",
   "v": "🐘"
  },
  "logoSize": 48
 },
 "showDifficulty": true
};
