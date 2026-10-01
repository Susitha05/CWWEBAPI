require('dotenv').config();
const dns = require('dns');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

const {Province,District} = require('./model/province')
const Substation = require('./model/station');
const Installation = require('./model/installation')
const Reading = require('./model/reading');
const User = require('./model/user');

const PROVINCES = [
  {province_id: 1, name: 'Western' },
  {province_id: 2, name: 'Central' },
  {province_id: 3,name: 'Southern' },
  {province_id: 4,name: 'Northern' },
  {province_id :5, name: 'Eastern' },
  {province_id: 6, name: 'North Western' },
  {province_id: 7, name: 'North Central' },
  {province_id: 8, name: 'Uva' },
  {province_id: 9, name: 'Sabaragamuwa' }
];
const DISTRICTS = [
  // Western Province
  {
    district_id: 1,
    province_id: 1,
    name: 'Colombo'
  },
  {
    district_id: 2,
    province_id: 1,
    name: 'Gampaha'
  },
  {
    district_id: 3,
    province_id: 1,
    name: 'Kalutara'
  },

  // Central Province
  {
    district_id: 4,
    province_id: 2,
    name: 'Kandy'
  },
  {
    district_id: 5,
    province_id: 2,
    name: 'Matale'
  },
  {
    district_id: 6,
    province_id: 2,
    name: 'Nuwara Eliya'
  },

  // Southern Province
  {
    district_id: 7,
    province_id: 3,
    name: 'Galle'
  },
  {
    district_id: 8,
    province_id: 3,
    name: 'Matara'
  },
  {
    district_id: 9,
    province_id: 3,
    name: 'Hambantota'
  },

  // Northern Province
  {
    district_id: 10,
    province_id: 4,
    name: 'Jaffna'
  },
  {
    district_id: 11,
    province_id: 4,
    name: 'Kilinochchi'
  },
  {
    district_id: 12,
    province_id: 4,
    name: 'Mannar'
  },
  {
    district_id: 13,
    province_id: 4,
    name: 'Vavuniya'
  },
  {
    district_id: 14,
    province_id: 4,
    name: 'Mullaitivu'
  },

  // Eastern Province
  {
    district_id: 15,
    province_id: 5,
    name: 'Batticaloa'
  },
  {
    district_id: 16,
    province_id: 5,
    name: 'Ampara'
  },
  {
    district_id: 17,
    province_id: 5,
    name: 'Trincomalee'
  },

  // North Western Province
  {
    district_id: 18,
    province_id: 6,
    name: 'Kurunegala'
  },
  {
    district_id: 19,
    province_id: 6,
    name: 'Puttalam'
  },

  // North Central Province
  {
    district_id: 20,
    province_id: 7,
    name: 'Anuradhapura'
  },
  {
    district_id: 21,
    province_id: 7,
    name: 'Polonnaruwa'
  },

  // Uva Province
  {
    district_id: 22,
    province_id: 8,
    name: 'Badulla'
  },
  {
    district_id: 23,
    province_id: 8,
    name: 'Monaragala'
  },

  // Sabaragamuwa Province
  {
    district_id: 24,
    province_id: 9,
    name: 'Ratnapura'
  },
  {
    district_id: 25,
    province_id: 9,
    name: 'Kegalle'
  }
];

dns.setServers(['8.8.8.8', '1.1.1.1']);

const INSTALLATIONS_PER_SUBSTATION = 9; // ~25 substations * 9 = 225 installations
const READING_INTERVAL_MINUTES = 15;
const DAYS_OF_HISTORY = 7;



function rand(min, max) {
  return Math.random() * (max - min) + min;
}


function powerAtHour(hourFraction, capacityKw) {
  const sunrise = 6, sunset = 18;
  if (hourFraction <= sunrise || hourFraction >= sunset) return 0;
  const span = sunset - sunrise;
  const x = ((hourFraction - sunrise) / span) * Math.PI;
  const clearSky = Math.sin(x);
  const cloudNoise = rand(0.85, 1.0); // mild variability
  return Math.max(capacityKw * clearSky * cloudNoise, 0);
}


async function run() {
    const uri = `mongodb+srv://${process.env.MONGODB_USERNAME}:${process.env.MONGODB_PASSWORD}@cluster0.potyfwz.mongodb.net`;
    const DB_NAME = 'solargenaration';
try {
    await mongoose.connect(uri, { dbName: DB_NAME });
    console.log('MongoDB connected');
} catch (err) {
    console.error('MongoDB connection error:', err);
    process.exit(1);
}
  console.log('Connected. Wiping existing collections...');
// replace your Promise.all(deleteMany...) block with this
await Promise.all(
  ['provinces', 'districts', 'stations', 'installations', 'readings', 'users'].map(async (name) => {
    try {
      await mongoose.connection.db.collection(name).drop();
    } catch (err) {
      if (err.codeName !== 'NamespaceNotFound') throw err; // fine if it didn't exist yet
    }
  })
);

console.log('Seeding provinces and districts...');
console.log('Seeding provinces...');

for (const p of PROVINCES) {
    await Province.create({
        province_id: p.province_id,
        name: p.name
    });
}

console.log('Seeding districts...');

const districtDocs = [];
for (const d of DISTRICTS) {
    const district = await District.create({
        district_id: d.district_id,
        province_id: d.province_id,
        name: d.name
    });

    districtDocs.push(district);
}

  console.log(`  ${PROVINCES.length} provinces, ${districtDocs.length} districts.`);

const substationDocs = [];

let substationCounter = 1;

for (const d of districtDocs) {

    const sub = await Substation.create({

        substation_id: substationCounter,

        code: `GSS-${String(substationCounter).padStart(3, '0')}`,

        name: `${d.name} Grid Substation`,

        district_id: d.district_id,

        province_id: d.province_id,

        voltage_level: '132/33 kV',

        transformer_capacity_mva:
            Math.round(rand(50, 200)),

        number_of_feeders:
            Math.floor(rand(3, 8)),

        commissioned_date:
            new Date(
                1990 +
                Math.floor(Math.random() * 30),
                Math.floor(Math.random() * 12),
                Math.floor(Math.random() * 28) + 1
            ),

        operator: 'Ceylon Electricity Board',

        status: 'operational'
    });

    substationDocs.push(sub);

    substationCounter++;
}
console.log(
    `${substationDocs.length} substations created.`
);
  console.log(`  ${substationDocs.length} substations.`);

  console.log('Seeding solar installations...');
const installationDocs = [];

let installationCounter = 1;

for (const sub of substationDocs) {

    for (
        let i = 0;
        i < INSTALLATIONS_PER_SUBSTATION;
        i++
    ) {

        const capacityKwp =
            Math.round(rand(3, 10) * 100) / 100;


        const inverterCapacity =
            Math.round(
                capacityKwp * rand(0.85, 1.0) * 100
            ) / 100;


        const panelWattage =
            [450, 500, 540, 550, 580, 600][
                Math.floor(Math.random() * 6)
            ];


        const inst =
            await Installation.create({

                installation_id:
                    installationCounter,


                reference_no:
                    `SL-PV-${String(
                        installationCounter
                    ).padStart(5, '0')}`,


                name:
                    `${sub.name.replace(
                        ' Grid Substation',
                        ''
                    )} Rooftop Solar Site ${i + 1}`,


                owner_name:
                    `Solar Owner ${installationCounter}`,


                owner_type:
                    'residential',


                district_id:
                    sub.district_id,


                province_id:
                    sub.province_id,

                location:
                { 
                    lat: rand(5.9, 9.8), lng: rand(79.6, 81.9) 
                },
                apiKey: uuidv4(),

                substation_id:
                    sub.substation_id,


                capacity_kwp:
                    capacityKwp,


                inverter_capacity_kw:
                    inverterCapacity,


                panel_wattage_w:
                    panelWattage,

                commissioned_date:
                    new Date(
                        2020 +
                        Math.floor(Math.random() * 6),
                        Math.floor(Math.random() * 12),
                        Math.floor(Math.random() * 28) + 1
                    ),


                status:
                    'active'
            });


        installationDocs.push(inst);

        installationCounter++;
    }
}

console.log(
    `${installationDocs.length} installations created.`
);
console.log(
    `Seeding ${DAYS_OF_HISTORY} days of readings at ${READING_INTERVAL_MINUTES}-minute intervals...`
);

const now = new Date();

const start = new Date(
    now.getTime() -
    DAYS_OF_HISTORY * 24 * 60 * 60 * 1000
);

const stepsPerDay =
    (24 * 60) / READING_INTERVAL_MINUTES;

const totalSteps =
    stepsPerDay * DAYS_OF_HISTORY;

let totalReadings = 0;

for (const inst of installationDocs) {

    const batch = [];

    let cumulativeEnergy = rand(0, 500);

    for (let step = 0; step < totalSteps; step++) {

        const ts = new Date(
            start.getTime() +
            step *
            READING_INTERVAL_MINUTES *
            60 *
            1000
        );

        const hourFraction =
            ts.getHours() +
            ts.getMinutes() / 60;

        const powerKw =
            Math.round(
                powerAtHour(
                    hourFraction,
                    inst.capacity_kwp
                ) * 1000
            ) / 1000;

        cumulativeEnergy +=
            powerKw *
            (READING_INTERVAL_MINUTES / 60);

        batch.push({
            installation: inst.installation_id,
            timestamp: ts,
            powerKw: powerKw,
            energyKwh:
                Math.round(
                    cumulativeEnergy * 1000
                ) / 1000,
            voltage:
                Math.round(
                    rand(225, 240) * 10
                ) / 10
        });
    }

  try {
      const result = await Reading.insertMany(batch, { ordered: false });
      totalReadings += result.length;
  } catch (err) {
      console.error('Insert error:', err.message);
      if (err.writeErrors) {
          console.error('First write error:', err.writeErrors[0]?.err?.errmsg);
      }
      // with ordered:false, some docs may still have been inserted
      totalReadings += err.insertedDocs?.length || 0;
  }
}

console.log(
    `${totalReadings} readings created.`
);

  console.log('Seeding SLSEA users...');
  const passwordHash = await bcrypt.hash('12345678!', 10);
  const western = await Province.findOne({ province_id: 1 });
  const gampaha = await District.findOne({ district_id: 4 });

  await User.create([
    { username: 'national.admin', passwordHash, role: 'national', jurisdiction: {} },
    { username: 'western.provincial', passwordHash, role: 'provincial', jurisdiction: { province: western.province_id } },
    { username: 'gampaha.district', passwordHash, role: 'district', jurisdiction: { province: western. district_id, district: gampaha. district_id } }
  ]);
  console.log('  3 users created (password for all: Password123!)');

  console.log('\nDone. Sample device API key for testing POST readings:');
  console.log(`  installationId: ${installationDocs[0].installation_id}`);
  console.log(`  apiKey:         ${installationDocs[0].apiKey}`);

  await mongoose.disconnect();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
