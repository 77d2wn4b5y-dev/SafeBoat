# Changelog

## v0.5.0 — Safety Engine

- Dodat je Safety Engine koji u realnom vremenu procenjuje najbližu opasnost koristeći postojeće GPS praćenje.
- Dodati su nivoi SAFE, INFO, WARNING i DANGER, zaštita od ponavljanja upozorenja i ograničenje za neprecizan GPS.
- Dodati su bezbednosni panel, uključivanje/isključivanje, test alerta i prikaz prilaza opasnosti na mapi.
- PWA keš i vidljiva verzija aplikacije ažurirani su na v0.5.0.

## v0.6.0 — Voice Copilot

- Dodata su višejezična glasovna upozorenja na srpskom, engleskom i grčkom jeziku.
- Dodat je prioritet alerta koji sprečava da manje važno upozorenje prekine važnije.
- Dodati su zvučni i vibracioni rezervni signali.
- Dodata su podešavanja jezika i stanja glasovnih upozorenja.
- Dodat je demo režim za INFO, WARNING i DANGER upozorenja.
- Dodat je dijalog „O aplikaciji“ sa opisom i navigacionim upozorenjem.

## v0.7.0 — Trip Recorder & Logbook

- Dodato je snimanje rute sa pauziranjem i nastavkom vožnje.
- Dodate su statistike udaljenosti, trajanja i brzine.
- Dodat je lokalni dnevnik poslednjih 20 vožnji.
- Dodati su prikaz aktivnih i sačuvanih ruta na mapi i GeoJSON izvoz.
- Omogućena je obnova prekinutog snimanja u pauziranom stanju.
- Safety WARNING i DANGER alerti beleže se kao događaji u aktivnoj vožnji.

## v0.8.0 — Route Planner & Navigation

- Dodato je planiranje rute pomoću tačaka na mapi.
- Dodata je aktivna navigacija sa kursom i udaljenošću do sledeće tačke.
- Dodati su ETA i ukupna preostala udaljenost.
- Dodata su upozorenja o odstupanju od rute i pouzdana detekcija dolaska na tačku.
- Dodato je lokalno čuvanje ruta i GeoJSON uvoz i izvoz.
- Dodata je provera koridora rute u odnosu na poznate opasnosti.
- Voice Copilot je proširen glasovnim navođenjem duž rute.

## v0.9.0 — Anchor Watch & Man Overboard

- Dodati su nadzor pozicije sidra i podesiv radijus Anchor Watch zone.
- Dodata su upozorenja na zanošenje sidra, kvalitet GPS-a i gubitak GPS signala.
- Dodato je čuvanje MOB pozicije sa udaljenošću i kursom za povratak do MOB tačke.
- Dodat je dijalog za hitni broj 112 sa prikazom i kopiranjem koordinata.
- Voice Copilot je proširen hitnim Anchor Watch i MOB porukama.
- Trip Recorder beleži Anchor Watch upozorenja i MOB događaje u aktivnoj vožnji.
- Dodate su pristupačne i zaštićene kontrole hitnih funkcija.

## v0.10.0 — Polish & Reliability

- Poboljšane su performanse mape, markera, linija i DOM osvežavanja.
- Smanjena je potrošnja baterije pauziranjem nepotrebnog rada kada je ekran skriven ili funkcija nije aktivna.
- Dodat je kompletan svetli i tamni režim sa sistemskim i ručnim izborom.
- Objedinjena su podešavanja za GPS, glas, navigaciju, vožnje, Anchor Watch i izgled.
- Poboljšani su pristupačnost, fokus, tastaturna navigacija, dodirne kontrole i smanjeno kretanje.
- Poboljšani su offline pokretanje, upravljanje kešom i automatsko uklanjanje starih keševa.
- Dodat je lagani interni logger i upravljanje zdravljem skladišta.
- Očišćen je kod i ispravljene su greške bez promene postojećih javnih API-ja.

## v1.0.0 — Sithonia Edition

- Offline vodič kroz plaže i obalna mesta Sitonije.
- Luke, marine i eksplicitno označena sidrišta sa statusom izvora i verifikacije.
- Offline pretraga, filteri, najbliže lokacije i lokalna omiljena mesta.
- Integracija sa Planerom rute bez automatskog pokretanja navigacije ili prepisivanja rute.
- Lokalni GeoJSON skup podataka i responzivni interfejs vodiča.
- Prvo stabilno SafeBoat izdanje.

## v1.0.1 — Sithonia Place Details Hotfix

- Marker tap now opens place details immediately.
- Serbian location names improved.
- Short Serbian descriptions improved for all 49 places.
- Mobile bottom-sheet navigation fixed with visible back and close actions.
- Empty optional detail rows removed; unknown nautical data is clearly identified.
- Sithonia dataset validation strengthened.

## v1.1.0 — Clean Map Interface

- Map-first startup centered on Diaporos and Vourvourou.
- Large panels collapsed by default.
- Empty-map tap toggles controls.
- Compact panel toggle button.
- Responsive mobile bottom sheet and tablet side panel.
- Active feature status chips.
- Improved interaction between the map, POIs and control panels.

## v1.1.2 — POI Coordinate Integrity Hotfix

- Preserved GeoJSON `[longitude, latitude]` source order through one validated Leaflet conversion path.
- Separated permanent beach labels from marker icons so label layout cannot affect geographic anchors.
- Added exact marker/source coordinate assertions and stricter Sithonia coordinate validation.
- Kept Diaporos map centering independent from stored POI coordinates.
- No dataset coordinates or dataset version were changed.

## v1.1.1 — Diaporos Map & Responsive Beach Details

- Diaporos-centered initial map view.
- Permanent beach-name labels below markers.
- Improved marker detail opening.
- Responsive beach-detail content.
- Removed horizontal scrolling from beach details.
- Missing fields are omitted instead of displaying placeholders.
