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
