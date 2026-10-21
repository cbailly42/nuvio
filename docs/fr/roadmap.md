[English](../roadmap.md) · [Polski](../pl/roadmap.md) · **Français**

# Feuille de route

Feuille de route des prochaines fonctionnalités ; la référence est [STATUS.md](../STATUS.md) (en anglais). Retour au [README](../../README.fr.md).

| Fonctionnalité | Description | État |
|---|---|---|
| Carte Assist / voix | parler à Assist de Home Assistant depuis une carte en verre, avec la réponse affichée dans la carte | fait en 0.10.0 |
| Centre de notifications | notifications persistantes, piles faibles, portes ouvertes et appareils indisponibles dans un seul panneau | prévu |
| Intégration du tableau de bord Énergie | lire les sources et les appareils dans les paramètres Énergie de HA au lieu de capteurs choisis à la main | en cours : la carte Énergie · semaine lit déjà la consommation, la production et le prix dans les paramètres Énergie de HA ; les cartes puissance, phases et photovoltaïque utilisent encore les capteurs choisis |
| Correction des cartes énergie et barres | afficher correctement `nuvio-energy-card` et `nuvio-bars-card` hors d’une grille de hauteur fixe | prévu |
| Configuration de la carte géographique | indication claire et solution de repli quand les tuiles de la carte sont indisponibles, plus une capture dans le README | prévu |
| Dispositions par appareil | une disposition différente pour le téléphone, la tablette et l’ordinateur au lieu d’une disposition commune | prévu |
| Éditeur de thème | flou du verre, rayon des coins, polices et palettes de couleurs personnalisés au-delà de la couleur d’accent | prévu |
| Partage de préréglages | partager dispositions et apparence sous forme de préréglages, avec une galerie d’import de préréglages de la communauté | prévu |
| Bibliothèque de composants et nouveau design | blocs de construction partagés (verre, boutons, interrupteurs, pastilles, surcouches), nouvelles cartes génériques, animations fluides, mises à jour en direct sans redessiner la carte, tailles S, M et L pour les panneaux larges et étroits, chargement plus rapide | fait en 1.0.0 : cartes réparties en fichiers en 0.11.2, nouveau verre et jetons de design en 0.12.0, blocs de construction et mises à jour en direct en 0.13.0, surcouches en 0.14.0, toutes les cartes au style commun avec mises à jour en direct en 0.15.0, 12 cartes génériques, pile et onglets en 0.16.0, bundle allégé et cartes hors écran en pause en 1.0.0 |
| Verrouillage de l’écran de veille (BÊTA) | toucher l’écran de veille affiche un pavé numérique rond en verre sur un fond flouté, avec les points du code PIN au-dessus et un bouton Verrouiller en dessous ; réglages du code PIN, du délai de verrouillage et de l’activation | fait en 1.3.0, animation de déverrouillage en 1.3.1 |
| Tableau de bord partagé | un tableau de bord pour chaque utilisateur Home Assistant, configuré par un administrateur, avec pour chaque personne la possibilité d’en sortir pour avoir sa propre disposition modifiable (Paramètres → Utilisateurs) | fait en 1.4.0 |
| Visibilité des vues par personne | choisir qui voit chaque vue ; chaque vue est visible par tout le monde par défaut (Paramètres → Vues) | fait en 1.5.0 |
| Rôles et autorisations | droits par personne au-delà des vues : qui peut modifier le tableau de bord partagé, ouvrir les Paramètres ou utiliser le verrouillage par code PIN, et cartes ou pièces masquées par personne | prévu |
| Passe d’accessibilité | libellés pour lecteurs d’écran, ordre du focus et audit des contrastes pour toutes les cartes et le mode édition | prévu |

Déjà fait dans la feuille de route précédente : éditeur de vues (Paramètres → Vues), i18n complète polonais / anglais, export / import de la configuration (Paramètres → Sauvegarde), indications sur l’Accueil vide, mode tablette murale (Paramètres → Écran de veille).
