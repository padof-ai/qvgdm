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
- **Cadrer une photo** : Paramètres › Questions, bouton **✂ Recadrer** sous chaque illustration. Choisissez le format du cadre (d'origine, 16:9, 3:2, 4:3, carré, portrait). Le cadre reste fixe : faites glisser la photo et zoomez (curseur, molette ou pincement). **⤢ Tout voir** fait tenir la photo entière dans le cadre, par exemple une photo en hauteur dans un cadre 16:9. Les bords vides sont alors remplis par la photo floutée, le bleu du jeu, du noir ou du blanc. **⛶ Remplir le cadre** coupe au contraire ce qui dépasse. Pour les 4 photos des réponses, **✂ Recadrer les 4 au même format…** les enchaîne dans le même format. La photo d'origine est conservée : vous pouvez recadrer autant de fois que vous voulez, ou revenir à l'original avec *Garder la photo d'origine*.
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
