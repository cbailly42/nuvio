[English](../installation.md) · [Polski](../pl/installation.md) · **Français**

# Installation

Nuvio nécessite Home Assistant 2024.8.0 ou plus récent. Retour au [README](../../README.fr.md).

## HACS (dépôt personnalisé)

1. HACS → ⋮ → *Dépôts personnalisés* → `https://github.com/kczepiec/nuvio`, catégorie **Dashboard**.
2. Installez **Nuvio**. HACS ajoute la ressource `/hacsfiles/nuvio/nuvio.js`.
3. Paramètres → Tableaux de bord → *Ajouter un tableau de bord* → *Nouveau tableau de bord à partir de zéro*, ouvrez-le, ⋮ → *Modifier* → ⋮ → *Éditeur de configuration brute* et collez :

   ```yaml
   strategy:
     type: custom:nuvio
   ```

4. Ouvrez le tableau de bord. L’assistant démarre à la première visite.

## Manuelle

1. Téléchargez l’archive des sources de la dernière version (GitHub, Releases, Source code) et copiez le contenu de son dossier `dist/` (`nuvio.js` et les fichiers `nuvio-font-*`, `nuvio-bg-*`, `nuvio-meteo-*`, `nuvio-locale-*`, tous à plat) dans `/config/www/nuvio/`. Les versions n’ont pas de fichiers joints.
2. Ajoutez la ressource `/local/nuvio/nuvio.js` (type : **Module JavaScript**).
3. Utilisez la même configuration `strategy` que ci-dessus.

## Modules complémentaires recommandés

Nuvio fonctionne seul, mais pour obtenir l’affichage plein écran des captures, ces modules HACS sont utiles :

| Module | Pourquoi |
|---|---|
| [kiosk-mode](https://github.com/NemesisRE/kiosk-mode) | Masque l’en-tête et/ou la barre latérale de Home Assistant pour ne laisser visible que le tableau de bord Nuvio (tablettes murales, téléphones). La navigation de Nuvio tient compte de kiosk-mode. |
| [custom-sidebar](https://github.com/elchininet/custom-sidebar) | Masque ou réordonne les éléments de la barre latérale de Home Assistant par utilisateur ou par appareil, si vous préférez garder la barre latérale en l’allégeant. |
| [browser_mod](https://github.com/thomasloven/hass-browser_mod) *(facultatif)* | Transforme un navigateur en appareil pilotable (fenêtres contextuelles, contrôle par appareil). Nuvio gère sa couche d’interaction et ignore les lecteurs multimédias et capteurs propres à browser_mod. |
