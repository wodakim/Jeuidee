# Jelly Evolution

## Comment lancer le jeu (How to run)

Le jeu utilise des modules modernes (ES Modules) et Phaser, il nécessite donc un serveur de développement capable de résoudre les imports (comme Vite).

**Vous ne pouvez pas ouvrir index.html directement dans le navigateur ou avec l'extension "Live Server" de base.**

### Prérequis
- [Node.js](https://nodejs.org/) installé sur votre machine.

### Instructions

1.  **Ouvrez un terminal** dans le dossier du projet.
2.  **Installez les dépendances** :
    `npm install`
3.  **Lancez le serveur de développement** :
    `npm run dev`
4.  Ouvrez le lien affiché dans le terminal (généralement http://localhost:5173).

### Pour la production (Android/Capacitor)

Pour créer la version optimisée à mettre dans Capacitor :

1.  Construisez le projet :
    `npm run build`
2.  Le dossier `dist/` contiendra les fichiers finaux (HTML/CSS/JS) prêts à être utilisés.
