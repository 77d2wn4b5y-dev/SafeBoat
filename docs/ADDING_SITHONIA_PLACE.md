# Dodavanje lokacije Sitonije

Dodajte jedan GeoJSON `Feature` tipa `Point` u `data/sithonia-places.geojson`. Koordinate su WGS84 decimalni brojevi u obaveznom redosledu **`[longitude, latitude]`**. Tačka mora biti u približnom okviru 39.85–40.35° N i 23.60–24.15° E.

## Svojstva

Kopirajte postojeći zapis i popunite sva obavezna svojstva. Stabilan `id` treba da bude normalizovan engleski naziv sa crticama. Dozvoljene kategorije su `beach`, `port`, `marina`, `anchorage`, `fuel`, `restaurant`, `boat_ramp`, `emergency`, `landmark`. `shore_type` je `sand`, `pebbles`, `rocks`, `mixed`, `unknown` ili `null`; `anchoring` je `suitable`, `caution`, `unsuitable` ili `unknown`; `boat_access` je `easy`, `caution`, `difficult` ili `unknown`.

Dozvoljeni sadržaji su `beach_bar`, `restaurant`, `cafe`, `toilets`, `shower`, `parking`, `shop`, `accommodation`, `lifeguard`, `fuel`, `water`, `electricity`, `slipway`, `mooring`. Ne unosite sadržaj samo zato što deluje verovatno.

## Izvor i verifikacija

Unesite samo podatke koje izvor zaista potvrđuje. Zabeležite `source`, `source_date` i `last_reviewed`; proverite licencu. Ako podatak nije potvrđen koristite `null`, `unknown`, praznu listu i `verified: false`. Verifikovan naziv/koordinata ne potvrđuje dubinu, prilaz ili sidrenje.

Pre dodavanja proverite ID i susedne tačke; validator prijavljuje tačke bliže od približno 25 m:

```sh
node scripts/validate-sithonia-data.mjs
```

## Lokalna slika

Slika je opciona. Dodajte optimizovan, legalno dostupan WebP u `assets/places/` i relativno svojstvo, npr. `"image": "assets/places/nikiti.webp"`. Ne koristite hotlink, udaljeni URL ni datoteku bez prava distribucije. Vodič mora raditi bez slike.
