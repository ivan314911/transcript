# Notes de réunion

Application qui enregistre vos réunions et les retranscrit en texte automatiquement, en français, directement dans le navigateur. Pas de serveur, pas d'abonnement, rien n'est envoyé sur internet.

---

## C'est quoi exactement ?

Imaginez un carnet qui s'écrit tout seul pendant que vous parlez. Vous appuyez sur un bouton pour démarrer l'enregistrement, vous parlez, vous appuyez sur stop, et quelques secondes plus tard le texte apparaît. C'est ça.

La magie vient d'un programme qui s'appelle **Whisper** (fait par OpenAI). On l'utilise ici dans sa version gratuite et open-source. Il tourne directement dans votre navigateur — comme si vous téléchargiez un mini-cerveau la première fois, et ensuite il travaille tout seul sur votre téléphone ou ordinateur.

---

## Avant de commencer : installer Node.js

Node.js est un outil qui permet de faire tourner l'application sur votre ordinateur. C'est comme installer un moteur avant de pouvoir conduire une voiture.

1. Allez sur **https://nodejs.org**
2. Cliquez sur le gros bouton vert marqué **"LTS"** (c'est la version stable)
3. Téléchargez et installez-le comme n'importe quel logiciel (suivez les étapes, cliquez "Suivant" jusqu'à la fin)
4. Pour vérifier que ça marche : ouvrez le Terminal (sur Mac : cherchez "Terminal" dans Spotlight) et tapez :
   ```
   node --version
   ```
   Si vous voyez un numéro (ex: `v22.0.0`), c'est bon.

---

## Lancer l'application sur votre ordinateur

### Étape 1 — Ouvrir le Terminal dans le bon dossier

Sur Mac, il y a un raccourci pratique :
- Ouvrez le **Finder**
- Naviguez jusqu'au dossier `transcript` sur votre Bureau
- Faites un **clic droit** sur le dossier `frontend` → "Nouveau terminal au dossier"

Sinon, ouvrez le Terminal et tapez :
```
cd ~/Desktop/transcript/frontend
```

### Étape 2 — Télécharger les dépendances (à faire une seule fois)

Dans le Terminal, tapez exactement ceci puis appuyez sur Entrée :
```
npm install
```

Vous allez voir des lignes défiler pendant 1 à 2 minutes. C'est normal, ça télécharge les pièces dont l'application a besoin. Attendez que ça s'arrête.

### Étape 3 — Démarrer l'application

```
npm run dev
```

Le Terminal va afficher quelque chose comme :
```
  ➜  Local:   http://localhost:5173/
  ➜  Network: http://192.168.1.42:5173/
```

### Étape 4 — Ouvrir dans le navigateur

- Sur votre **ordinateur** : ouvrez Chrome et allez sur `http://localhost:5173`
- Sur votre **smartphone** (même Wi-Fi) : ouvrez Chrome et tapez l'adresse "Network" affichée dans le Terminal (ex: `http://192.168.1.42:5173`)

### Première utilisation

La toute première fois, l'app télécharge le modèle Whisper (~40 Mo). Attendez que la pastille en haut à droite passe de "Chargement…" à **"IA prête"** avant d'enregistrer. Ensuite, ce téléchargement ne se refait plus.

---

## Utiliser depuis le smartphone uniquement (sans ordi allumé)

Si vous voulez accéder à l'app depuis votre téléphone à tout moment, sans avoir besoin d'un ordinateur allumé, il faut la mettre en ligne gratuitement sur **Netlify**. C'est comme mettre l'app sur un serveur dans un nuage.

### Étape 1 — Mettre le code sur GitHub

GitHub est un site où on stocke du code. Créez un compte sur **https://github.com** si vous n'en avez pas.

Ensuite, installez **GitHub Desktop** (https://desktop.github.com), c'est plus simple que la ligne de commande :
1. Ouvrez GitHub Desktop
2. "File" → "Add Local Repository" → sélectionnez le dossier `transcript`
3. S'il dit que ce n'est pas un dépôt Git, cliquez "Initialize Repository"
4. Cliquez **"Publish repository"** (en haut) → donnez-lui un nom → cliquez "Publish"

Votre code est maintenant sur GitHub.

### Étape 2 — Déployer sur Netlify

1. Créez un compte sur **https://netlify.com** (gratuit)
2. Cliquez **"Add new site"** → **"Import an existing project"**
3. Choisissez **GitHub** et autorisez Netlify à accéder à vos dépôts
4. Sélectionnez le dépôt `transcript`
5. Netlify lit automatiquement le fichier `netlify.toml` — **ne changez rien**, cliquez juste **"Deploy site"**
6. Après 1-2 minutes, Netlify vous donne une URL du genre `https://truc-machin-123.netlify.app`

Ouvrez cette URL depuis votre smartphone → l'app fonctionne, microphone inclus, sans rien allumer chez vous.

> Vous pouvez personnaliser l'URL dans les réglages Netlify (ex: `https://mes-reunions.netlify.app`).

---

## Questions fréquentes

**Le micro ne fonctionne pas sur le téléphone ?**
Le navigateur mobile n'autorise le micro que sur une connexion sécurisée (HTTPS). En local (réseau Wi-Fi), Chrome Android fonctionne souvent quand même. Sur Safari iPhone, il faut obligatoirement passer par Netlify (URL en https).

**L'app est lente pour transcrire ?**
C'est normal pour les enregistrements longs. Whisper tiny analyse environ 1 minute de parole en 15-30 secondes sur un smartphone récent. Pour plus de précision (mais plus lent), changez le modèle dans `frontend/src/useWhisper.js` : remplacez `whisper-tiny` par `whisper-base`.

**Les notes disparaissent quand je ferme l'app ?**
Oui, pour l'instant les notes sont en mémoire. Téléchargez-les en `.txt` avant de fermer, ou copiez-collez le texte ailleurs.
