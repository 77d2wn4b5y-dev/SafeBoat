# Izvori podataka — Sithonia Guide

## Status početnog skupa

Početni skup za v1.0.0 sastavljen je iz opšte poznatih naziva obalnih mesta navedenih u specifikaciji izdanja. Tokom implementacije nije korišćen eksterni izvor koji bi opravdao tvrdnju o terenskoj verifikaciji. Zato su svi zapisi označeni sa `verified: false`, `source: null`, a nepoznata nautička svojstva ostaju `null` ili `unknown`.

Koordinate su **približne orijentacione tačke lokacija**, nisu merenje prilaza, granica plaže ili plovnog puta. Ne treba ih koristiti kao zvaničnu navigacionu kartu. Dataset nije pravno ni geografski potpun.

## Format i licenciranje

Koordinate su decimalni WGS84 u GeoJSON redosledu `[longitude, latitude]`. Novi doprinos mora dokumentovati stvarni izvor i njegovu licencu. Nemojte kopirati podatke, fotografije ili tekst iz izvora čiji uslovi to ne dozvoljavaju. U ovom izdanju nema preuzetih fotografija niti izmišljenih URL-ova izvora.

## Pravila za buduće doprinose

- Navedite naziv/URL stvarno korišćenog pouzdanog izvora, datum izvora i datum pregleda.
- `verified: true` koristite samo kada zapis i relevantna svojstva imaju proverljiv osnov; ne podrazumeva bezbednost plovidbe.
- Ne unosite dubinu, bezbedan prilaz, morsko dno, opasnosti, pogodnost sidrenja, usluge ili pravna ograničenja bez odgovarajućeg izvora.
- Izbegnite duplikate i pokrenite `node scripts/validate-sithonia-data.mjs`.

Podaci o lokacijama služe za planiranje i informisanje. Ne predstavljaju zvaničnu nautičku kartu i ne potvrđuju dubinu, bezbednost prilaza, stanje mora niti pogodnost za sidrenje.

## v1.1.3 audit koordinata plaža

Svih 34 zapisa kategorije `beach` uključena su u audit. OpenStreetMap je određeni
izvor za proveru imenovanih objekata plaža, ali mrežni pristup OSM servisima nije bio
dostupan tokom ovog pregleda. Zato nijedna približna koordinata nije nagađanjem
promenjena niti označena kao potvrđena. Svaki zapis je naveden u
`reports/sithonia-coordinate-audit.json` kao zahtev za ručni pregled.

Kada se pronađe i pregleda odgovarajući imenovani OSM objekat, zapis i audit čuvaju
njegov identifikator (na primer `osm:way/123456`). Podaci OpenStreetMap-a su
**© OpenStreetMap contributors** i dostupni su pod licencom
[Open Database License (ODbL)](https://www.openstreetmap.org/copyright).

Verifikacija izvora odnosi se isključivo na geografski identitet i položaj tačke.
Ne potvrđuje dubinu, bezbedan prilaz, sidrenje, morsko dno, struje, podvodne
opasnosti, sadržaje ili zaklon od vremena. SafeBoat nije zamena za zvaničnu
nautičku kartu.
