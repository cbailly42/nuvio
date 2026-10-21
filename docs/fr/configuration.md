[English](../configuration.md) · [Polski](../pl/configuration.md) · **Français**

# Configuration

Réglages facultatifs de Nuvio. Retour au [README](../../README.fr.md).

Options facultatives de la stratégie :

```yaml
strategy:
  type: custom:nuvio
  language: fr        # tout code de langue disponible (en, pl, fr …) : langue par défaut du tableau de bord (un choix personnel dans les Paramètres reste prioritaire)
```

## Langue

Nuvio est disponible en plusieurs langues : aujourd’hui en anglais, en polonais et en français, ainsi que dans toute langue ajoutée sous forme de catalogue (voir plus bas). Chaque personne choisit sa langue dans **Paramètres → Apparence → Langue** (*Automatique*, puis un bouton par langue disponible) ou avec l’élément de langue du menu utilisateur, accessible à tous, y compris aux personnes sans accès aux paramètres. Tout le tableau de bord change d’un coup, sans recharger la page : navigation, cartes, paramètres, mode édition, notifications, nombres et dates. Le choix est enregistré sur cet appareil et dans votre compte Home Assistant, et vous suit donc sur vos autres appareils.

Langue utilisée, la première qui correspond l’emporte :

1. Votre propre choix dans les Paramètres ou le menu utilisateur.
2. L’option de stratégie `language:` (langue par défaut du tableau de bord, définie en YAML). Elle accepte tout code de langue dont dispose Nuvio (`en`, `pl`, `fr` …) ; un code régional comme `fr-CA` se ramène à `fr`.
3. La langue choisie dans l’assistant de première configuration.
4. Les langues de votre navigateur, par ordre de préférence : d’abord le code complet (`pt-br`), puis la langue seule (`pt`). Si aucune n’est disponible, l’anglais.

Les textes non traduits dans la langue choisie s’affichent en anglais.

### Ajouter une langue

Une langue tient dans un seul fichier JSON. Aucune modification du code n’est nécessaire.

1. Créez `src/locales/<code>.json`, où `<code>` est le code de la langue en minuscules (`de`, `pt-br` …). Le plus simple est de partir d’une copie de `src/locales/en.json`, le catalogue de référence.
2. Complétez son bloc `_meta` :

   ```json
   "_meta": {
     "name": "Deutsch",
     "locale": "de-DE",
     "flag": "🇩🇪",
     "intro": "Oberfläche auf Deutsch"
   }
   ```

   `name` (le nom de la langue dans cette langue, affiché dans les sélecteurs de langue) et `locale` (dates, nombres et règles du pluriel) sont obligatoires. `flag` et `intro` sont facultatifs : l’assistant de première configuration les affiche à l’étape de la langue (sinon, un globe et le nom).
3. Traduisez les valeurs. Gardez tels quels les clés, les `{variables}` et les suffixes de pluriel, et fournissez toutes les formes de pluriel dont votre langue a besoin (voir [Développement](development.md#traductions)). Une clé absente s’affiche en anglais.
4. Vérifiez le catalogue : `python3 tools/i18n_check.py --lang <code>` liste les clés manquantes et obsolètes, et `python3 tools/i18n_check.py` contrôle les variables, les formes de pluriel et `_meta`.
5. Compilez avec `python3 tools/build.py`. Le catalogue est compilé dans `dist/nuvio-locale-<code>.<hash>.json` et la langue est ajoutée au manifeste intégré au bundle : elle apparaît dans les Paramètres, le menu utilisateur et l’assistant, et `language: <code>` comme la détection du navigateur la reconnaissent.

L’anglais, le polonais et le français doivent rester complets (`REQUIRED` dans `tools/i18n_check.py`) ; une autre langue peut être partielle, et le contrôle se contente alors d’un avertissement indiquant sa couverture.

> [!TIP]
> Pour reprendre un tableau de bord généré sous forme de YAML ordinaire, utilisez *Prendre le contrôle* dans l’éditeur du tableau de bord. Toutes les cartes `custom:nuvio-*` continuent de fonctionner.

## Préréglages

La configuration (disposition + apparence) peut être exportée et importée en JSON. Les préréglages personnels sont conservés hors du dépôt.
