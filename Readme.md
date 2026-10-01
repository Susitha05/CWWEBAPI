# SLSEA Real-Time Solar Generation Data API

Coursework: NB6007CEM Web API Development. Node.js + Express + Mongoose (MongoDB).

Models a national solar-generation monitoring system for the Sri Lanka Sustainable Energy
Authority: a geographic/asset hierarchy (Province → District → Grid Substation →
Solar Installation → Generation Reading) plus SLSEA users with jurisdiction-scoped read
access. Metering devices are write-only clients, scoped to their own installation.

> Note: Province and District use plain numeric `province_id` / `district_id` fields rather
> than Mongo ObjectIds, seeded from a fixed reference list of Sri Lanka's 9 provinces and
> 25 districts. Substation, Installation, Reading and User still reference by ObjectId.

## 1. Prerequisites

- Node.js 18+
- A MongoDB Atlas cluster (or any reachable MongoDB instance)


## 3. Install and seed

```
npm install
npm run seed
```

This wipes and rebuilds:

| Collection | Count |
|---|---|
| Provinces | 9 |
| Districts | 25 |
| Grid Substations | 1 per district (25) |
| Solar Installations | 9 per substation (~225) |
| Generation Readings | 7 days × 15-min intervals per installation (~672 each, ~151,000 total) |
| Users | 3 (see below) |

Readings follow a diurnal curve (zero overnight, peak around noon) with mild random
variability, so pagination, filtering, and sorting are exercising real data rather than
flat/empty collections.

**⚠️ If you previously ran an earlier version of this schema**, drop the affected
collections (or the whole database) before reseeding rather than relying on
`deleteMany({})` — a renamed/removed unique index (e.g. an old `district_ID` field) can
survive `deleteMany` and cause `E11000 duplicate key` errors on the next seed run.

## 4. Running the API

```
npm start        # production
npm run dev       # nodemon, if configured
```

- Health check: `GET /health`
- API docs (Swagger/OpenAPI): `GET /docs`

> Confirm these routes still match your `server.js` — update if your mount paths differ.


> Double check the `gampaha.district` user's `district_id` lookup in `seed.js` actually
> resolves to Gampaha (`district_id: 2`) and not a different district, since a wrong id
> there silently scopes the test user to the wrong place.

## 6. Device write path

Each seeded installation gets a random UUID `apiKey`. The seed script prints one at the
end of its run for testing. Devices authenticate by sending it as `x-api-key` and may only
post readings for their own installation:

```
POST /api/installations/<installationId>/readings
x-api-key: <that installation's apiKey>
Content-Type: application/json

{ "powerKw": 3.2, "energyKwh": 1042.5, "voltage": 231.0 }
```

## 7. Project structure

```
model/
  province.js    Province + District (numeric ids, plain hierarchy)
  station.js     Substation + Installation
  reading.js     GenerationReading (append-only time series)
  user.js        SLSEA user (role + jurisdiction)
seed/seed.js     populates the dataset described above
server.js        Express app entrypoint
routes/          one file per resource family
middleware/       auth (device API key + user JWT), error handling
```

> This section assumes your routes/middleware layout is unchanged from earlier in the
> project — update the tree above if you've since reorganized those too.

## 8. Deploying

1. **Database** — MongoDB Atlas free tier; allow access from anywhere (0.0.0.0/0) for
   coursework purposes; create a DB user matching `MONGODB_USERNAME`/`MONGODB_PASSWORD`.
2. **API** — push to GitHub with incremental commits (a single upload is marked as weak
   deployment evidence), then deploy on Render/Railway/Fly.io:
   - Build command: `npm install`
   - Start command: `npm start`
   - Set `MONGODB_USERNAME`, `MONGODB_PASSWORD`, `JWT_SECRET` as environment variables —
     never commit `.env`.
3. Confirm `/health` and `/docs` both load on the **public HTTPS URL** before submitting —
   localhost-only submissions aren't accepted.
