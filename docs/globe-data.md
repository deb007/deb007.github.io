# Globe data and rendering

Rendering: canvas 2D with a precomputed point set (no WebGL, no map library, no 3D engine). Reason: at this point density canvas 2D gives the dot-globe look at a fraction of the runtime cost, and the globe chunk stays far below the 60 KB gzipped budget.

## Sources (public domain, Natural Earth)
- Land: https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_land.geojson (127 Polygon features)
- Cities: https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_50m_populated_places_simple.geojson (1,251 features; lowercase property keys)
- Licence: Natural Earth data is public domain. No attribution required.

## How the data is built
`npm run build:globe-data` runs `scripts/build-globe-data.mjs`. It fetches the two files once and writes `src/globe/points.json`, which is committed; the raw downloads are not.
- Land: 24,000 points on a fixed Fibonacci sphere, tested against the land polygons, stored as a bitset (6,925 land points). No polygon, outline or boundary is stored.
- City lights: places with 400k+ people, thinned to 0.5 degrees, stored as lon, lat and a weight 1 to 3 only. Names and country codes are discarded.

## Drawing rules
Land and cities are filled squares only. The only strokes are great-circle arcs between fixed unlabeled points and the faint orbit line of the bottom Earth. No text is drawn on any canvas.
