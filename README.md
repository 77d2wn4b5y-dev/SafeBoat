# SafeBoat

SafeBoat je PWA pomoćnik za bezbedniju rekreativnu plovidbu oko Sitonije.

## v0.4.1

- refaktorisana struktura projekta
- CSS izdvojen u `css/`
- JavaScript izdvojen u `js/`
- GeoJSON podaci izdvojeni u `geojson/`
- struktura pripremljena za budući Safety Engine

## Pokretanje

Aplikacija koristi service worker i `fetch`, pa je pokrenite preko lokalnog HTTP
servera, na primer:

```sh
python3 -m http.server 8080
```

Zatim otvorite <http://localhost:8080>.
