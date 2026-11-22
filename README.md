# Qui veut gagner des applaudissements ? — version en ligne

Le jeu se joue à plusieurs, en direct :

- **l'écran animateur** (`/admin`) est projeté depuis le PC : accueil avec le QR code, tableau des questions, questions, révélation, classement ;
- **les joueurs** scannent le QR code et répondent sur leur téléphone (`/`) : ils saisissent leur prénom, choisissent un avatar, puis répondent à chaque question avec leurs propres jokers.

Le serveur n'a **aucune dépendance** : rien à installer, `node server.js` suffit (Node.js 18 ou plus récent).

---

## 1. Mettre le projet sur GitHub (5 minutes, sans logiciel)

1. Créez un compte sur [github.com](https://github.com) si besoin, puis cliquez sur **New** (nouveau dépôt).
2. Nom du dépôt : par exemple `quiz-applaudissements`. Cochez **Private** (voir l'encadré sur les musiques plus bas), puis **Create repository**.
3. Sur la page du dépôt vide, cliquez sur le lien **uploading an existing file**.
4. Décompressez le fichier .zip sur votre PC, ouvrez le dossier `qvgda-en-ligne`, sélectionnez **tout son contenu** (fichiers et dossiers `public`, `lib`, `exemples`…) et glissez-le dans la page GitHub.
5. Attendez la fin du chargement, puis cliquez sur **Commit changes**.

Vérifiez que `server.js` et `package.json` apparaissent **à la racine** du dépôt (et pas dans un sous-dossier `qvgda-en-ligne`).

> **Musiques** : les fichiers du dossier `public/sounds` viennent de votre PowerPoint et semblent être des musiques de l'émission. Gardez le dépôt **privé** : Render fonctionne très bien avec un dépôt privé. Vous pouvez aussi les remplacer par vos propres fichiers MP3 (mêmes noms de fichiers).
>
> | Fichier dans `public/sounds` | Quand il joue |
> |---|---|
> | `generique.mp3` | Accueil et remerciements |
> | `transition.mp3` | Arrivée sur le tableau des questions |
> | `question.mp3` | Pendant la question (en boucle) |
> | `suspense.mp3` | Après la clôture des réponses (en boucle) |
> | `revelation.mp3` | Révélation de la bonne réponse (facultatif : sinon son synthétisé) |
> | `applaudissements.mp3` | Classement, remerciements, fin de l'applaudimètre |
> | `mauvaise-reponse.mp3` | Facultatif (sinon « wah wah wah » synthétisé) : sur le PC quand personne n'a trouvé la bonne réponse, et sur le téléphone de chaque joueur qui s'est trompé |
> | `joker-5050.mp3`, `joker-public.mp3`, `joker-phone.mp3` | Jokers, sur le téléphone du joueur (facultatifs) |
>
> Noms en minuscules, sans accent, extension `.mp3`. Les fichiers déposés sur GitHub servent sur tous les ordinateurs ; une musique importée dans Paramètres › Sons ne vaut que pour le navigateur de ce PC (et y reste prioritaire).

## 2. Mettre le jeu en ligne sur Render (10 minutes)

1. Créez un compte sur [render.com](https://render.com) avec **Sign in with GitHub** (plus simple).
2. Tableau de bord → **New +** → **Web Service** → **Build and deploy from a Git repository**.
3. Autorisez Render à accéder à votre dépôt `quiz-applaudissements` (bouton *Configure account* si le dépôt privé n'apparaît pas), puis sélectionnez-le.
4. Réglages :
   - **Name** : par exemple `quiz-applaudissements` (il donnera l'adresse `https://quiz-applaudissements.onrender.com`) ;
   - **Region** : *Frankfurt (EU Central)* ;
   - **Branch** : `main` ;
   - **Runtime** : *Node* ;
   - **Build Command** : `npm install` ;
   - **Start Command** : `node server.js` ;
   - **Instance Type** : *Free*.
5. Rubrique **Environment Variables** → **Add Environment Variable** :
   - Key : `ADMIN_PASSWORD`
   - Value : le mot de passe de votre choix (il protège la page animateur).
6. **Create Web Service**. Après 1 à 3 minutes, l'état passe à **Live** et l'adresse du jeu s'affiche en haut de la page.

Variante : le fichier `render.yaml` permet aussi de passer par **New + → Blueprint**.

**Mettre à jour le jeu plus tard** : remplacez les fichiers sur GitHub (*Add file → Upload files*) ; Render redéploie automatiquement en 1 à 2 minutes.

## 3. Le jour J

1. **5 minutes avant**, ouvrez `https://votre-adresse.onrender.com/admin` sur le PC relié au vidéoprojecteur. Sur l'offre gratuite, le serveur s'endort après 15 minutes sans visite : le premier chargement peut prendre jusqu'à une minute. Tant que la page animateur reste ouverte, elle le garde éveillé.
2. Saisissez le mot de passe (`ADMIN_PASSWORD`). Il est mémorisé sur ce PC.
3. Paramètres (⚙) : vérifiez vos questions. Les 15 questions « Spécial Nantes » sont proposées au premier lancement ; si vous aviez déjà ouvert la page animateur, importez `exemples/nantes.json` (onglet **Sauvegarde → Importer**). Pour l'immersion, importez `exemples/immersion-achats.json` (onglet **Sauvegarde → Importer**) : les 10 questions et leurs 10 illustrations sont chargées.
4. Passez en plein écran (⛶ ou F11). L'accueil affiche le **QR code** : les participants le scannent, saisissent leur prénom et choisissent un avatar. Ils apparaissent en direct sur l'écran.
5. **Lancer le jeu** → cliquez sur une question → **Afficher la question** : elle s'affiche sur l'écran **et** sur tous les téléphones.
6. Les réponses se closent quand tout le monde a répondu, à la fin du temps imparti ou avec **Clore les réponses**. Musique de suspense, puis **Révéler la bonne réponse** (ou touche Entrée) : pourcentages par réponse, les plus rapides, votre rebond 👉, et chaque téléphone affiche son résultat.
7. **Classement** : classement individuel, aussi affiché sur chaque téléphone. **À points égaux, le joueur le plus rapide passe devant** : il y a (presque) toujours un gagnant unique pour le lot (voir « Départage des ex-aequo » plus bas).

## Ce qui change par rapport à la version HTML

| Fonction | Version en ligne |
|---|---|
| Tirage au sort | Supprimé : tous les joueurs répondent à chaque question sur leur téléphone |
| Équipes | Supprimées : chacun s'inscrit avec son prénom et son avatar |
| Jokers | Sur le téléphone de chaque joueur, une fois par partie (ou à chaque question, au choix) ; chaque joker utilisé retire des points comme avant |
| Vote du public | Résultat simulé selon la difficulté de la question, sur le téléphone du joueur |
| Appel à un ami | Compte à rebours sur le téléphone du joueur |
| Chrono | Temps pour répondre réglable (30 s par défaut, 0 = vous closez vous-même) |
| Questions, points, difficulté, illustrations, rebond, emblème, animateurs, sons | Identiques |

## Bon à savoir

- **Préparer les questions dans Excel** : remplissez `exemples/Questions-quiz.xlsx` (Oui/Non, ordre, textes, laïus), puis Paramètres › Sauvegarde › Importer : seules les questions en « Oui » remplacent celles du jeu.
- **Départage des ex-aequo par la vitesse** (Paramètres › Général, activé par défaut) : pour chaque bonne réponse, le serveur mesure le temps entre l'ouverture de la question et le moment où le joueur touche sa réponse. Le temps passé pendant l'appel à un ami n'est pas compté. À points égaux, le plus petit temps cumulé passe devant. Après chaque révélation, chaque téléphone affiche « ⏱ Réponse en 4,2 s ». Au classement, le temps cumulé apparaît à côté des joueurs à égalité de points, et leur téléphone indique qu'ils ont été départagés à la vitesse. Si vous décochez l'option, les joueurs à égalité restent ex-aequo.
- **Photos toujours en entier** : sans rien faire, chaque illustration s'affiche en entier sur la question, à la plus grande taille possible, et elle ne passe jamais sous la question, même quand le laïus apparaît après la révélation. Dans la grille des 4 photos, les photos de formats différents gardent la même taille de case et les bords sont complétés automatiquement par la photo floutée. Le recadrage reste facultatif : sous chaque illustration, l'état « ✓ entière » ou « recadrée » est indiqué. Le bouton **↺ Image entière** revient à la photo d'origine, et **↺ Afficher toutes les photos en entier** (en haut de l'onglet Questions) annule tous les recadrages d'un coup.
- **Cadrer une photo** (facultatif) : bouton **✂ Recadrer** ; choisissez le format du cadre, faites glisser et zoomez la photo ; *Tout voir* la fait tenir entière, *Remplir le cadre* coupe ce qui dépasse.
- **Vos réglages** (questions, illustrations, sons) restent dans le navigateur du PC animateur. Exportez-les (onglet Sauvegarde) pour animer depuis un autre ordinateur. Les fichiers .json de la version HTML s'importent aussi.
- **La partie en cours** (joueurs, scores) est gardée en mémoire par le serveur et recopiée sur le PC animateur. Si Render redémarre le serveur en pleine partie, la page animateur renvoie automatiquement sa copie : les joueurs se reconnectent tout seuls, sans perdre leurs points.
- **Un joueur qui ferme son navigateur** retrouve sa place en rouvrant la page sur le même téléphone.
- **Bonne réponse** : elle n'est envoyée aux téléphones qu'au moment de la révélation, impossible de tricher en inspectant la page.
- **Capacité** : testé avec 120 joueurs simultanés (120 réponses traitées en moins d'un dixième de seconde, environ 60 Mo de mémoire).
- **Avatars en pied (format portrait)** : tous les avatars s'affichent en entier, au format portrait 3:4 : mur de l'accueil, avatars devant les réponses, podium, téléphones. Les personnages proposés sont dessinés en pied, façon « chibi » (grosse tête, sweat, pantalon, baskets).
- **Images d'avatar** (par exemple un avatar chibi par participant) :
  - **préparées à l'avance** : Paramètres › Général › *Avatars préparés pour les participants* › **Importer des images…** (plusieurs fichiers d'un coup). Le prénom est tiré du nom du fichier (`Avatar_chibi_Alexis.png` → Alexis) et reste modifiable. Quand un joueur rejoint la partie sous ce prénom, son avatar est appliqué automatiquement. Le bouton *Appliquer aux joueurs déjà connectés* rattrape ceux qui sont déjà inscrits. Les avatars préparés sont aussi proposés quand vous changez l'avatar d'un joueur, et ils sont inclus dans l'export .json ;
  - **envoyées par les joueurs** : sur le téléphone, le bouton *📷 Utiliser mon image* permet à chacun d'envoyer son propre avatar ou sa photo. Vous pouvez toujours le remplacer ou exclure le joueur ;
  - **traitement automatique** : le fond blanc (ou uni et clair) est retiré, l'image est recadrée sur le personnage, placée pieds en bas et allégée (WebP d'environ 20 à 40 Ko). Décochez *Retirer le fond blanc* si l'image a un décor à garder.
- **Musique des jokers sur les téléphones** (Paramètres › Général, activée par défaut) : quand un joueur utilise un joker, son téléphone joue la musique correspondante. Le 50:50 fait un « whoosh ». Le vote du public dure environ 5 secondes, et le résultat s'affiche sur l'accord final. L'appel à un ami joue la numérotation et deux sonneries, puis une musique d'attente pendant le compte à rebours, et raccroche dès que le joueur répond ou que le temps est écoulé. Chaque joueur peut couper le son avec le bouton 🔊 en haut de son écran. Pour utiliser vos propres musiques, déposez dans `public/sounds` des fichiers nommés `joker-5050.mp3`, `joker-public.mp3` et `joker-phone.mp3` (musique d'attente, jouée en boucle) : ils remplacent les sons synthétisés. Le téléphone ne doit pas être en mode silencieux et le volume doit être monté.
- **Animations et ambiance** :
  - **Avatars vivants**, sur l'écran et sur les téléphones : ils respirent et se balancent, et les personnages dessinés par le jeu clignent des yeux et font coucou. Sur l'accueil, le mur des joueurs occupe toute la place libre : les avatars sont très grands quand il y a peu de monde, et chaque nouvel arrivant entre en sautant.
  - **Pendant la question**, la bande en bas de l'écran montre ceux qui ont déjà répondu (avatar qui lève la main ✋), sans révéler leur choix. À la clôture, chaque avatar **court jusqu'à sa réponse**, et un pronostic s'affiche : « 60 % de la salle pense que c'est A… ». À la révélation, les bons sautent de joie et les autres sont dépités. Sur le téléphone, l'avatar du joueur réagit aussi, avec des étoiles quand il a bon.
  - **Séries** : après 3 bonnes réponses d'affilée, une flamme 🔥 apparaît à côté du joueur. En option (Paramètres › Général), chaque série de 3 rapporte 1 point bonus.
  - **La course** : un classement animé où les barres avancent et les joueurs se doublent. Elle s'affiche toutes les 3 questions (réglable), en revenant au tableau, et le bouton « 📊 La course » du tableau l'affiche à tout moment.
  - **Réactions** : les joueurs envoient 👏 😂 😮 ❤️ 🔥 🎉 depuis leur téléphone, et les émojis s'envolent sur l'écran projeté avec leur avatar. Cette option se désactive dans les paramètres.
  - **Applaudimètre** (bouton 👏 du tableau, du classement et des remerciements) : choisissez pour qui on applaudit. Pendant 8 à 20 secondes, chaque téléphone devient un gros bouton 👏 à taper, et on peut aussi secouer le téléphone. Une jauge géante monte sur l'écran, puis le total et le record s'affichent.
  - **Podium dévoilé un par un** : roulement de tambour, 3e, 2e, puis le 1er avec sa couronne, des confettis et une fanfare. Pendant ce temps, les téléphones affichent « roulement de tambour » pour ne rien dévoiler. Cliquez sur l'écran pour tout dévoiler d'un coup.
  - **Trophées** : l'éclair ⚡, sans filet 🦁, le roi du 50:50 ✂️, l'ami du public 👥, pendu au téléphone 📞, en feu 🔥, la remontée 📈, fidèle au poste 🎯. Ils sont répartis entre le plus de joueurs possible et chacun voit les siens sur son téléphone.
  - **Moments forts** : la question la plus ratée, la mieux réussie, celle qui a le plus divisé la salle, et la réponse la plus rapide de la soirée.
  - **Photo souvenir** : une image du podium et de tous les avatars, à télécharger depuis l'écran projeté ou depuis chaque téléphone (« 📸 Ma photo souvenir »).
  - **Personnaliser son personnage** sur le téléphone, avant ou pendant la partie : coiffure, couleurs des cheveux, de la peau et du haut, sweat, pull ou t-shirt, motif, pantalon ou jupe, baskets, pose, sourire, lunettes, taches de rousseur, barbe.
  - **5 dernières secondes** : le chrono tique et les téléphones vibrent à chaque seconde.
- **Gestion des joueurs** : cliquez sur un joueur dans le mur de l'accueil, ou sur le bouton « 👥 joueurs connectés » du tableau des questions, pour :
  - **changer son avatar** (personnage, émoji, initiales ou photo importée) : il change aussi sur son téléphone ;
  - **l'exclure du jeu** : ses points sont retirés, son téléphone affiche qu'il ne participe plus, et il ne peut pas revenir sous ce nom. La liste « Exclus » permet de le réautoriser.
- **Avatars devant les réponses** : dès que les réponses sont closes, l'avatar de chaque joueur apparaît en face de la réponse qu'il a choisie (au-delà de 9 joueurs sur une réponse, un compteur « +N » s'affiche).
- **Tester en local** : `ADMIN_PASSWORD=test node server.js`, puis ouvrez `http://localhost:3000/admin`. Les téléphones doivent être sur le même réseau Wi-Fi et utiliser l'adresse IP du PC (le QR code affiche l'adresse de la page animateur : ouvrez-la avec l'IP, pas avec `localhost`).

## Contenu du projet

```
server.js              serveur (pages, temps réel, QR code, scores)
package.json           démarrage : node server.js
render.yaml            déploiement Render en « Blueprint » (facultatif)
lib/qrcode/            générateur de QR code (licence MIT, Kazuhiko Arase)
public/admin.*         page animateur (projetée)
public/player.*        page joueur (téléphone)
public/common.js       avatars et utilitaires communs
public/default-config.js  questions proposées au premier lancement
public/sounds/         musiques jouées sur le PC animateur
exemples/nantes.json            15 questions « Spécial Nantes » (niveau relevé), avec un laïus après chaque réponse
exemples/immersion-achats.json  les 10 questions de l'immersion, avec illustrations
exemples/Questions-quiz.xlsx    toutes les questions dans Excel : sélection (Oui/Non), ordre, modification, puis import direct dans le jeu
```
