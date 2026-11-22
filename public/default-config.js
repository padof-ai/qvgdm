/* Configuration proposée au premier lancement (modifiable dans Paramètres) */
const DEFAULT_CONFIG = {
 "title": "Qui veut gagner des applaudissements ?",
 "subtitle": "Spécial Direction Achats et Supply Chain",
 "tagline": "Quel pôle ou département méritera le plus d’applaudissements ?",
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
 "footer": "Quiz réalisé en partie grâce à l’intelligence artificielle",
 "questions": [
  {
   "id": "q0",
   "text": "Quelle est la différence entre une mouette et un goéland ?",
   "answers": [
    "Il n’y a aucune différence, juste deux termes pour désigner le même oiseau.",
    "Le goéland est plus grand et plus bruyant que la mouette.",
    "Le goéland a un plumage entièrement noir, contrairement à la mouette.",
    "La mouette est plus rapide car le « go est lent »."
   ],
   "correct": 1,
   "difficulty": 1,
   "label": "DARMI",
   "note": ""
  },
  {
   "id": "q1",
   "text": "D’ici 2027, le projet Celtic reliera les postes de Cork en Irlande et de La Martyre en Bretagne sur une distance de 575km. Mais les Irlandais utilisant encore le système impérial, pouvez-vous me transformer cette distance en Miles ?",
   "answers": [
    "246 Miles",
    "357 Miles",
    "485 Miles",
    "663 Miles"
   ],
   "correct": 1,
   "difficulty": 2,
   "label": "DART",
   "note": ""
  },
  {
   "id": "q2",
   "text": "Sous l’Ancien Régime, quelle alliance liait officiellement les corsaires malouins à l’autorité royale pour légitimer leurs actions en mer ?",
   "answers": [
    "Le Pacte des Frères de la Côte",
    "La Charte de Saint-Malo",
    "L’Ordre de la Mer Royale",
    "La Lettre de Course"
   ],
   "correct": 3,
   "difficulty": 3,
   "label": "PLQF",
   "note": ""
  },
  {
   "id": "q3",
   "text": "Pour venir à ce séminaire, quel pôle ou département a le meilleur bilan carbone ?",
   "answers": [
    "15 personnes du PEPA venues en train depuis Paris",
    "8 personnes du PASO venues en train depuis Toulouse",
    "8 personnes du PAM venues en train depuis Marseille",
    "11 personnes du PAO venues avec 4 voitures hybride/essence depuis Nantes"
   ],
   "correct": 2,
   "difficulty": 3,
   "label": "PEPA",
   "note": ""
  },
  {
   "id": "q4",
   "text": "Dans quelle ville il pleut le plus en moyenne en France (en nombre de jours par mois) ?",
   "answers": [
    "Bayonne",
    "Quimper",
    "Grenoble",
    "Limoges"
   ],
   "correct": 2,
   "difficulty": 4,
   "label": "DACI",
   "note": ""
  },
  {
   "id": "q5",
   "text": "Comment dit-on « A la tienne, santé » en Breton ?",
   "answers": [
    "yech’ ed mat !",
    "iec’hed mat !",
    "yec’ hed mat !",
    "iech’ ed mat !"
   ],
   "correct": 2,
   "difficulty": 4,
   "label": "PAO",
   "note": ""
  },
  {
   "id": "q6",
   "text": "Quel acteur américain a un ancêtre originaire de Saint-Malo ?",
   "answers": [
    "Jim CARREY",
    "Brad PITT",
    "Tom CRUISE",
    "Georges CLOONEY"
   ],
   "correct": 0,
   "difficulty": 3,
   "label": "PAP",
   "note": ""
  },
  {
   "id": "q7",
   "text": "Dans quel ordre chronologique se sont déroulés les différents séminaires de la Direction Achats et Supply Chain ?",
   "answers": [
    "Chamonix/Melun/Biarritz/Nancy/Marseille/Saint-Malo",
    "Melun/Chamonix/Biarritz/Nancy/Marseille/Saint-Malo",
    "Melun/Biarritz/Chamonix/Nancy/Marseille/Saint-Malo",
    "Biarritz/Melun/Chamonix/Nancy/Marseille/Saint-Malo"
   ],
   "correct": 1,
   "difficulty": 3,
   "label": "PANE",
   "note": ""
  },
  {
   "id": "q8",
   "text": "A quel pays les îles Malouines, tenant leur nom des habitants de Saint-Malo, appartiennent-elles ?",
   "answers": [
    "La France",
    "L’Espagne",
    "L’Argentine",
    "La Grande-Bretagne"
   ],
   "correct": 3,
   "difficulty": 2,
   "label": "PAE",
   "note": ""
  },
  {
   "id": "q9",
   "text": "Quel est l’âge moyen des personnes présentes ce soir et donc à quelque chose près, l’âge moyen de la Direction Achats &amp; Supply Chain ?",
   "answers": [
    "37 ans",
    "40 ans",
    "43 ans",
    "46 ans"
   ],
   "correct": 2,
   "difficulty": 4,
   "label": "PARAA",
   "note": ""
  },
  {
   "id": "q10",
   "text": "Parmi ces boissons, à boire avec modération bien sûr, laquelle n’est pas une spécialité bretonne ?",
   "answers": [
    "Le chouchen",
    "Le lambig",
    "Le pommeau",
    "L’absinthe"
   ],
   "correct": 3,
   "difficulty": 1,
   "label": "PAM",
   "note": ""
  },
  {
   "id": "q11",
   "text": "Laquelle de ces cités médiévales fortifiées a la plus grande superficie ?",
   "answers": [
    "Guérande",
    "Avignon",
    "Saint-Malo",
    "Carcassonne"
   ],
   "correct": 1,
   "difficulty": 4,
   "label": "PASO",
   "note": ""
  },
  {
   "id": "q12",
   "text": "De ces cités médiévales fortifiées, laquelle a ou avait les plus longs remparts ?",
   "answers": [
    "Guérande",
    "Saint-Malo",
    "Avignon",
    "Carcassonne"
   ],
   "correct": 2,
   "difficulty": 4,
   "label": "",
   "note": ""
  },
  {
   "id": "q13",
   "text": "Le drapeau breton, appelé “Gwenn ha Du”, est composé de neuf bandes et d’un canton chargé d’hermines. Que représentent les neuf bandes du drapeau ?",
   "answers": [
    "Les neuf ports historiques de Bretagne",
    "Les neuf anciennes provinces bretonnes",
    "Les évêchés traditionnels, cinq en Basse‑Bretagne et quatre en Haute‑Bretagne",
    "Les neuf batailles fondatrices du duché de Bretagne"
   ],
   "correct": 2,
   "difficulty": 2,
   "label": "Direction",
   "note": ""
  }
 ],
 "revealMode": "manual",
 "suspenseSec": 6,
 "autoClose": true,
 "jokerScope": "game"
};
