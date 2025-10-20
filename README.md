# Playwright Custom Reporter

Une librairie npm TypeScript moderne pour générer des rapports d'exécution Playwright personnalisés avec dashboard interactif, filtres avancés et visualiseur de traces intégré.

## ✨ Fonctionnalités

- 📊 **Dashboard interactif** avec métriques et graphiques en temps réel
- 📋 **Table des tests** avec filtres et tri avancés
- 🔍 **Panel détaillé** pour chaque test avec timeline
- 🎥 **Support complet** des vidéos, screenshots et traces
- 🌓 **Mode sombre/clair** avec préférences sauvegardées
- 📱 **Interface responsive** et moderne
- ⚡ **Visualiseur de traces intégré** (sans redirection externe)
- 🏷️ **Système de tags** automatique et personnalisé
- 🖥️ **Serveur HTTP intégré** avec détection automatique du outputDir

## 🚀 Installation

```bash
npm install playwright-custom-reporter
```

## 📖 Utilisation

Dans votre fichier `playwright.config.ts`:

```typescript
import { PlaywrightCustomReporter } from "playwright-custom-reporter";

export default {
  reporter: [
    ["html"], // Reporter HTML par défaut
    [
      PlaywrightCustomReporter,
      {
        outputDir: "./custom-report",
        open: "never",
      },
    ],
  ],
  // ... autres configurations
};
```

## Configuration

- `outputDir`: Répertoire de sortie du rapport (défaut: './custom-report')
- `title`: Titre du rapport (défaut: 'Playwright Test Report')
- `open`: Ouverture automatique ('always', 'never', 'on-failure')

## 🖥️ Visualisation des rapports

### Démarrage automatique (détection du outputDir)

```bash
npm run show-report
```

Le serveur détecte automatiquement le répertoire du rapport à partir de la configuration Playwright et démarre sur `http://localhost:3737`.

### Démarrage avec répertoire spécifique

```bash
npm run serve-report /path/to/custom-report
```

### Commandes disponibles

#### Développement rapide

```bash
npm run dev:serve           # Build + copie + démarre le serveur (tout en un)
npm run build:dev           # Build web + copie vers le rapport
npm run show-report         # Sert le rapport (détection auto)
```

#### Tests et génération

```bash
npm run test:example        # Génère un exemple de rapport
npm run copy:to-report      # Copie le bundle vers le rapport existant
```

#### Serveur

```bash
npm run serve-report        # Serveur avec détection automatique
npm run serve-report /path  # Serveur avec répertoire spécifique
```

## 🔍 Détection automatique

Le serveur cherche automatiquement le répertoire de rapport dans cet ordre :

1. **Configuration Playwright** : Lit `outputDir` depuis les fichiers :

   - `playwright.config.ts/js`
   - `example.playwright.config.ts/js`

2. **Répertoires de fallback** :

   - `./example/custom-report`
   - `./custom-report`
   - `./test-results/custom-report`
   - `./playwright-report`

3. **Argument en ligne de commande** :
   ```bash
   npm run serve-report /path/to/report
   ```

## 🛠️ Développement

### Workflow de développement recommandé

```bash
# Développement rapide (recommandé)
npm run dev:serve           # Build + copie + serveur en une commande

# Ou étape par étape
npm run build:dev           # Build web + copie vers rapport
npm run show-report         # Démarre le serveur

# Mode watch pour développement continu
npm run dev                 # TypeScript + Webpack en watch mode
```

### Commandes de build

```bash
npm run build               # Build complet (production)
npm run build:web          # Build des composants web uniquement
npm run build:ts           # Build TypeScript uniquement
npm run clean              # Nettoyer les builds
```

### Tests et qualité

```bash
npm run test               # Tests unitaires (Jest)
npm run test:example       # Tests Playwright + génération de rapport
npm run lint               # ESLint
npm run format             # Prettier
```
