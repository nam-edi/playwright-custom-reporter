# @naamedi/playwright-reporter

[![npm version](https://badge.fury.io/js/@naamedi%2Fplaywright-reporter.svg)](https://badge.fury.io/js/@naamedi%2Fplaywright-reporter)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-16%2B-green.svg)](https://nodejs.org/)

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
- 🚀 **Ouverture automatique** du serveur selon vos préférences

## 🚀 Installation

```bash
npm install @naamedi/playwright-reporter
```

## 📖 Utilisation

### Configuration rapide

Dans votre fichier `playwright.config.ts`:

```typescript
import { defineConfig } from "@playwright/test";

export default defineConfig({
  // ... autres configurations
  reporter: [
    [
      "@naamedi/playwright-reporter",
      {
        outputDir: "./custom-report", // Répertoire de sortie
        title: "Mon Rapport de Tests", // Titre du rapport
        open: "on-failure", // Ouverture automatique
      },
    ],
  ],
  use: {
    trace: "on", // Activer les traces
    video: "retain-on-failure", // Vidéos en cas d'échec
    screenshot: "only-on-failure", // Captures d'écran
  },
});
```

### Utilisation avec import (TypeScript)

```typescript
import { PlaywrightCustomReporter } from "@naamedi/playwright-reporter";

export default defineConfig({
  reporter: [
    [
      PlaywrightCustomReporter,
      {
        /* options */
      },
    ],
  ],
});
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

## 🚀 Fonctionnalités avancées

### Trace viewer intégré

Le reporter inclut un visualiseur de traces intégré qui ne dépend pas de trace.playwright.dev :

- **Visualisation locale** : Les traces sont servies directement depuis votre machine
- **Pas de dépendance externe** : Fonctionne complètement offline
- **Interface native** : Utilise la même interface que le rapport HTML natif de Playwright

### Serveur automatique

Pour les options `open: "always"` ou `open: "on-failure"`, un serveur HTTP est automatiquement lancé :

- **Port personnalisé** : Utilise le port 3737 par défaut
- **Arrêt automatique** : Le serveur se ferme proprement à la fin des tests
- **Gestion des connexions** : Suivi des connexions actives pour un arrêt gracieux

## 📊 Métriques et statistiques

Le dashboard fournit des métriques détaillées :

- **Taux de réussite global** avec graphique en secteurs
- **Distribution des durées** des tests
- **Tests les plus lents** avec temps d'exécution
- **Historique des exécutions** (si disponible)
- **Statistiques par suite de tests**

## 🎨 Thèmes et personnalisation

### Mode sombre/clair

- **Détection automatique** du thème système
- **Commutateur manuel** dans l'interface
- **Persistence** des préférences utilisateur

### Couleurs personnalisées

Le système utilise des propriétés CSS personnalisées facilement modifiables :

```css
:root {
  --primary-color: #007acc;
  --success-color: #28a745;
  --warning-color: #ffc107;
  --error-color: #dc3545;
}
```

## 🔧 Configuration avancée

### Options du reporter

```typescript
import { PlaywrightCustomReporter } from "@naamedi/playwright-reporter";

export default {
  reporter: [
    [
      PlaywrightCustomReporter,
      {
        outputDir: "./custom-reports",
        open: "on-failure", // 'always' | 'never' | 'on-failure'
        includeProjectInTestTitle: true,
        attachments: {
          screenshot: "only-on-failure",
          video: "retain-on-failure",
          trace: "retain-on-failure",
        },
      },
    ],
  ],
};
```

### Serveur de développement

Pour servir manuellement un rapport existant :

```bash
# Installation globale
npm install -g @naamedi/playwright-reporter

# Servir un rapport
npx @naamedi/playwright-reporter serve ./playwright-report
```

## 📦 Structure du projet

```
src/
├── collector/          # Collecte des données pendant l'exécution
│   └── data-collector.ts
├── reporter/           # Logique principale du reporter
│   ├── index.ts
│   ├── html-generator.ts
│   └── types.ts
├── server/             # Serveur HTTP pour les rapports
│   └── serve-report.ts
└── web/               # Interface utilisateur React
    ├── components/
    ├── hooks/
    └── styles/
```

## 🤝 Contribution

Les contributions sont les bienvenues ! Voici comment contribuer :

1. **Fork** le projet
2. **Créez** une branche pour votre fonctionnalité (`git checkout -b feature/amazing-feature`)
3. **Committez** vos changements (`git commit -m 'Add amazing feature'`)
4. **Push** sur la branche (`git push origin feature/amazing-feature`)
5. **Ouvrez** une Pull Request

## 📄 Licence

Ce projet est sous licence MIT. Voir le fichier [LICENSE](LICENSE) pour plus de détails.

## 🐛 Signaler un bug

Si vous trouvez un bug, veuillez créer une [issue](https://github.com/naamedi/playwright-reporter/issues) avec :

- **Description** détaillée du problème
- **Étapes** pour reproduire le bug
- **Version** de Playwright utilisée
- **Configuration** de votre projet

## 📞 Support

- 📖 **Documentation** : Consultez ce README
- 🐛 **Issues** : [GitHub Issues](https://github.com/naamedi/playwright-reporter/issues)
- 💬 **Discussions** : [GitHub Discussions](https://github.com/naamedi/playwright-reporter/discussions)

---

**Développé avec ❤️ par Naamedi**
