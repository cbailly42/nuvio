# Glossaire FR (partagé entre les dispatches de la tâche 9 — à compléter, ne pas contredire)

Règles : vouvoiement ; espace insécable U+00A0 avant : ; ! ? et à l'intérieur de « » (« texte ») ; pas de guillemets droits " dans les textes ; espace insécable U+00A0 entre un nombre/une variable et son unité ou % ({percent} %, {h} h, {seconds} s, {minutes} min, 4 Mo) ; apostrophe typographique ’ ; majuscule seulement en début de libellé (style HA FR) ; abréviations sans point superflu (min, h, s) ; nombres et unités : la mise en forme vient du code ; ne jamais changer les variables {name} etc.

Vocabulaire de l'interface française de Home Assistant :
- entity → entité ; device → appareil ; area → pièce (HA FR dit « Pièce » pour area) ; floor → étage ; zone → zone
- dashboard → tableau de bord ; view → vue ; card → carte ; tile → tuile ; section → section ; badge → badge
- automation → automatisation ; script → script ; scene → scène ; helper → entrée (HA FR « Entrées »)
- settings → paramètres ; edit mode → mode édition ; save → enregistrer ; cancel → annuler ; delete/remove → supprimer / retirer ; close → fermer ; done → terminé ; back → retour ; reset → réinitialiser ; restore defaults → restaurer les valeurs par défaut
- on/off (states) → allumé/éteint (lumière, interrupteur) ; activé/désactivé (générique) ; open/closed → ouvert/fermé ; locked/unlocked → verrouillé/déverrouillé ; unavailable → indisponible ; unknown → inconnu ; home/away → à la maison/absent
- heating/cooling → chauffage/climatisation (modes) ; en chauffe / en refroidissement (actions en cours) ; fan → ventilation ; humidity → humidité
- screensaver → écran de veille ; wall panel → écran mural ; backup → sauvegarde ; import/export → importer/exporter ; user → utilisateur ; accent colour → couleur d'accent ; background → fond d'écran ; look/appearance → apparence
- vacuum → aspirateur robot ; media player → lecteur multimédia ; alarm panel → alarme ; lock → serrure ; camera → caméra ; thermostat → thermostat ; weather → météo ; energy → énergie ; solar → photovoltaïque / solaire
- Brand names (Nuvio, Home Assistant, Assist, HACS) and units stay as is.

Ajouts des dispatches (terme EN → FR, contexte) :
- (9a) layout → disposition (sauvegarde, vues, pièces) ; custom layout → disposition personnalisée ; shared dashboard → tableau de bord partagé
- (9a) area (HA) → pièce, y compris « Pièce HA », « Paramètres → Pièces » ; room → pièce ; custom room → pièce personnalisée
- (9a) widget → widget ; tile → tuile ; header → en-tête ; sidebar → barre latérale ; panel (vue/panneau latéral) → panneau ; kiosk → kiosque
- (9a) household → foyer ; household strip → bandeau du foyer ; family → famille ; people → personnes ; You → Vous
- (9a) Edit (bouton) → Modifier ; Remove → Retirer ; Delete → Supprimer ; Move up/down → Monter / Descendre ; Show/Hide → Afficher / Masquer ; hidden → masqué(e)
- (9a) Choose / Pick → Choisir (bouton) / Choisissez… (consigne) ; Enter a … → Saisissez … ; Search… → Rechercher…
- (9a) Could not save ({error}) → Enregistrement impossible ({error}) ; Could not X → X impossible / Impossible de X ; … – reloading… → … – rechargement…
- (9a) Saved on this device only → Enregistré uniquement sur cet appareil ; Saved locally only → Enregistré localement uniquement
- (9a) preview → aperçu ; live → en direct ; label → libellé ; optional → facultatif ; default → par défaut ; custom → personnalisé(e) ; e.g. → ex.
- (9a) screensaver → écran de veille ; dimming → assombrissement ; wall tablet mode → mode tablette murale ; PIN → code PIN ; PIN pad → pavé numérique ; wake → réveiller
- (9a) motion sensor → détecteur de mouvement ; sensor (générique) → capteur ; upload → envoyer / envoi ; orb → sphère ; clock → horloge
- (9a) Now playing → En cours de lecture ; Paused → En pause ; Play → Lecture ; Mute/Unmute → Couper le son / Rétablir le son ; Shuffle → Aléatoire ; Repeat → Répétition
- (9a) common.on_short/off_short → Marche / Arrêt ; on_masc/on_neut/off_masc/off_neut → Activé / Désactivé ; off_fem (mode clim off) → Arrêt
- (9a) states.* en minuscules (insérés dans des phrases) : on/off → allumé/éteint ; home/not_home → à la maison/absent ; open/closed → ouvert/fermé (binary door/window/garage_door : ouverte/fermée) ; detected/clear → détecté(e)/normal ; idle → inactif ; docked → sur la base ; returning → retour à la base ; heating (action) → chauffe ; cooling → refroidissement ; dry → déshumidification ; fan_only → ventilation seule ; occupancy on/off → occupé/libre ; alarm armed/disarmed → armée/désarmée ; states.label.* avec majuscule (Allumé, Éteint, Armée (absent)…)
- (9a) climate modes : Heating → Chauffage ; Cooling → Refroidissement ; Fan → Ventilateur ; Drying → Déshumidification ; Fan only → Ventilation seule ; Air conditioning → Climatisation ; Climate (vue/section) → Climat
- (9a) weather : Clear (night) → Nuit dégagée ; Partly cloudy → Partiellement nuageux (court : Éclaircies) ; Pouring → Averses ; Sleet → Neige fondue ; Windy → Venteux ; Thunderstorm/Storm → Orage
- (9a) relative time : {m} min ago → il y a {m} min ; in {minutes} min → dans {minutes} min ; just now → à l’instant ; yesterday → hier ; tomorrow → demain
- (9a) Check-in / Check-out (enfant, LiveKid) → Arrivée / Départ ; At facility → Sur place ; Away (enfant) → Absent
- (9a) Integrations → Intégrations ; add-ons (HACS) → modules complémentaires ; Frontend (HACS) laissé tel quel
- (9a, fix 1) MODES HVAC (états, pastilles), comme HA FR : heat → chauffe ; cool → froid ; heat_cool → chaud/froid ; off → arrêt (prime sur « chauffage/climatisation (modes) » plus haut pour les libellés d’état courts ; « Chauffage » / « Climatisation » restent valables pour les titres et noms d’appareil)
- (9a, fix 1) alarm armed_home → Armée (à la maison) ; hidden (suffixe après vue/pièce) → masquée
- (9b) picker names : on garde le préfixe tel qu’en EN (« Home Glass – … », « Nuvio – … », « Home Glass : Robots ») ; nom de carte court (Climatisation, Pièces, Jauge, Coup d’œil, Pile, Grande valeur, Tuile interrupteur…)
- (9b) Choose a … (consigne carte vide) → Choisissez un/une … ; Pick … or leave empty to detect automatically → Choisissez … ou laissez vide pour une détection automatique ; Tap to … → Touchez pour … ; Hold to … → Maintenez pour … ; Hold: details → Appui long : détails
- (9b) entity not found → entité introuvable ; No X → Aucun(e) X ; Loading… → Chargement… ; unavailable (carte) → indisponible
- (9b) clim./ventilation compacts : Cool → Froid ; Dry → Déshum. ; Fan (pastille) → Ventil. ; Fan (ligne) → Ventilation ; Swing → Oscillation (court Oscill.) ; setpoint / target temperature → consigne / température de consigne ; Eco → Éco ; preset → préréglage ; Boost/Turbo/Max/Auto inchangés
- (9b) fan/robot speeds : Low/Medium/High → Faible / Moyen(ne) / Élevé(e) ; Quiet/Silent → Silencieux ; Strong → Fort ; Mop → Lavage (option) / Serpillière (consommable) ; Vacuum (option) → Aspiration ; Dock → Base ; Docked → Sur la base ; Returning → Retour à la base
- (9b) appareils : washer → lave-linge ; kettle → bouilloire ; air fryer → friteuse à air ; air purifier → purificateur d’air ; water heater / hot water tank → chauffe-eau / ballon d’eau chaude ; inverter → onduleur ; grid → réseau ; PV → PV / photovoltaïque ; mower → tondeuse ; timer → minuteur ; slider → curseur ; cover → volet ; gate → portail ; smart lock → serrure connectée
- (9b) washer jobs : Washing → Lavage ; Rinsing → Rinçage ; Spinning → Essorage ; Pre-wash → Prélavage ; Rinse hold → Arrêt cuve pleine ; Delayed start → Départ différé ; Wrinkle prevention → Anti-froissage
- (9b) temps : {x} ago → il y a {x} ; for {dur} → depuis {dur} ; {time} left → reste {time} ; today/yesterday {time} → aujourd’hui / hier à {time} ; unité jours abrégée → j
- (9b) lock : Lock/Unlock → Verrouiller / Déverrouiller ; Locked/Unlocked → Verrouillé(e) / Déverrouillé(e) (serrure : féminin) ; Jammed → Bloquée
- (9b) self powered → autonome / autonomie ; Consumption → Consommation ; Production → Production ; Grid consumption → Consommation réseau
- (9c) component → composant ; container → conteneur ; stack (HA) → pile (Pile verticale / horizontale) ; glass (cadre) → cadre en verre ; Look (feuille) → Apparence (« Apparence → En-tête », « Apparence → Pièces ») ; sheet (fenêtre d’édition) → fenêtre
- (9c) Add X → Ajouter un/une X ; Settings (feuille) → Paramètres de la carte / de la tuile / de la pièce / de la section ; Discard → Abandonner ; Stay → Rester ; Duplicate → Dupliquer ; Set (bouton) → Appliquer ; Upload → Envoyer ; Uploading… → Envoi… ; Restore hidden → Restaurer les éléments masqués ; Reset to default → Réinitialiser / Rétablir la disposition par défaut
- (9c) (empty = automatic) → (vide = automatique) ; (empty = from the same sensor) → (vide = depuis le même capteur) ; optional → facultatif ; e.g. → ex. ; Desktop / Tablet / Phone → Ordinateur / Tablette / Téléphone ; Full width → Pleine largeur ; Half → Moitié ; Small / Medium → Petite / Moyenne (taille)
- (9c) grid import / export (énergie) → soutirage / injection (aussi cards.flow.import/export) ; strings (PV) → strings ; inverter → onduleur ; tagline → slogan ; greeting → accueil ; reading (type de tuile) → valeur ; Default (style de tuile) → Normal
- (9c) icon search : les noms MDI sont anglais → « Rechercher des icônes (noms anglais, ex. sofa, lamp) » ; Ctrl+Shift+R → Ctrl+Maj+R
