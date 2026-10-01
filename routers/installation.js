const express = require('express');
const { v4: uuidv4 } = require('uuid');
const Installation = require('../model/installation');
const Substation = require('../model/station');
const {District} = require('../model/province');
const Reading = require('../model/reading');
const { ApiError } = require('../middleware/errorHandler');
const { deviceAuth } = require('../middleware/api');
const { assertDistrictAllowed } = require('../utils/jurisdiction');
const { sendWithConditionalGet } = require('../utils/conditionalGet');
const { parsePagination, buildPagination } = require('../utils/paginate');

const router = express.Router();

async function districtIdForInstallation(installation) {
  const substation = await Substation.findOne({substation_id : installation.substation_id});
  return substation ? substation.district : null;
}

function requireNational(req) {
  if (req.user.role !== 'national') {
    throw new ApiError(403, 'FORBIDDEN', 'Only national-level users may manage installation records.');
  }
}

/**
 * @swagger
 * /v1/api/installation:
 *   get:
 *     summary: Get installations
 *     description: Returns paginated installations with optional filtering.
 *     tags:
 *       - Installations
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: province
 *         schema:
 *           type: string
 *         description: Filter by province
 *       - in: query
 *         name: district
 *         schema:
 *           type: string
 *         description: Filter by district
 *       - in: query
 *         name: substation
 *         schema:
 *           type: string
 *         description: Filter by substation
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum:
 *             - active
 *             - inactive
 *         description: Filter by installation status
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *         description: Number of records per page
 *     responses:
 *       200:
 *         description: Successfully retrieved installations
 */
router.get('/', async (req, res, next) => {
  try {
    const { province, district, substation, status } = req.query;

    let filter = {};

    if (substation) {
      const s = await Substation.findOne({
        substation_id: substation
      });

      if (!s) {
        throw new ApiError(
          404,
          'NOT_FOUND',
          'Substation not found.'
        );
      }

      assertDistrictAllowed(req.user, s.district_id);

      filter.substation_id = s.substation_id;

    } else if (district) {

      assertDistrictAllowed(req.user, district);

      const subs = await Substation
        .find({ district_id: district })
        .select('substation_id');

      filter.substation_id = {
        $in: subs.map(s => s.substation_id)
      };

    } else if (province) {

      const districts = await District
        .find({ province_id: province })
        .select('district_id');

      const districtIds = districts.map(d => d.district_id);

      const subs = await Substation
        .find({ district_id: { $in: districtIds } })
        .select('substation_id');

      filter.substation_id = {
        $in: subs.map(s => s.substation_id)
      };

    } else if (req.user.role !== 'national') {

      const districtFilter =
        req.user.role === 'district'
          ? { district_id: req.user.district }
          : { province_id: req.user.province };

      const districts = await District
        .find(districtFilter)
        .select('district_id');

      const districtIds = districts.map(d => d.district_id);

      const subs = await Substation
        .find({ district_id: { $in: districtIds } })
        .select('substation_id');

      filter.substation_id = {
        $in: subs.map(s => s.substation_id)
      };
    }

    if (status) {
      filter.status = status;
    }

    const { page, limit, skip } = parsePagination(req);

    console.log("FINAL FILTER:", filter);

    const [installations, total] = await Promise.all([
      Installation
        .find(filter)
        .sort({ name: 1 })
        .skip(skip)
        .limit(limit),

      Installation.countDocuments(filter)
    ]);

    console.log("INSTALLATIONS:", installations);

    res.json({
      data: installations,
      meta: buildPagination(req, total, page, limit)
    });

  } catch (err) {
    next(err);
  }
});

/**
 * @swagger
 * /v1/api/installation:
 *   post:
 *     summary: Register a new solar installation
 *     description: Register a new rooftop solar installation. Only national-role users are authorized.
 *     tags:
 *       - Installations
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - substation_id
 *               - owner_name
 *               - owner_type
 *               - location
 *               - capacity_kwp
 *               - inverter_capacity_kw
 *               - panel_wattage_w
 *               - commissioned_date
 *               - status
 *             properties:
 *               name:
 *                 type: string
 *                 example: Colombo Rooftop Solar Site 1
 *               reference_no:
 *                 type: string
 *                 example: SL-PV-00001
 *               owner_name:
 *                 type: string
 *                 example: Solar Owner 1
 *               owner_type:
 *                 type: string
 *                 enum:
 *                   - residential
 *                   - commercial
 *                   - industrial
 *                 example: residential
 *               location:
 *                 type: object
 *                 required:
 *                   - lat
 *                   - lng
 *                 properties:
 *                   lat:
 *                     type: number
 *                     format: double
 *                     example: 8.02066345768157
 *                   lng:
 *                     type: number
 *                     format: double
 *                     example: 79.92729738494354
 *               substation_id:
 *                 type: integer
 *                 example: 1
 *               capacity_kwp:
 *                 type: number
 *                 format: double
 *                 example: 5.29
 *               inverter_capacity_kw:
 *                 type: number
 *                 format: double
 *                 example: 5.04
 *               panel_wattage_w:
 *                 type: integer
 *                 example: 540
 *               status:
 *                 type: string
 *                 enum:
 *                   - active
 *                   - inactive
 *                 example: active
 *     responses:
 *       201:
 *         description: Installation successfully created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *       400:
 *         description: Validation error or invalid substation
 *       403:
 *         description: Forbidden - only national-role users can register installations
 */
router.post('/', async (req, res, next) => {
  try {
    requireNational(req);

    const {
      name,
      reference_no,
      substation_id,
      owner_name,
      owner_type,
      location,
      capacity_kwp,
      inverter_capacity_kw,
      panel_wattage_w,
      status
    } = req.body;

    // Validation
    if (
      !name ||
      !substation_id ||
      !owner_name ||
      !owner_type ||
      !location ||
      !capacity_kwp ||
      !inverter_capacity_kw ||
      !panel_wattage_w ||
      !status
    ) {
      throw new ApiError(
        400,
        'VALIDATION_ERROR',
        'name, substation_id, owner_name, owner_type, location, capacity_kwp, inverter_capacity_kw, panel_wattage_w and status are required.'
      );
    }

    // Check substation
    const sub = await Substation.findOne({
      substation_id: substation_id
    });

    if (!sub) {
      throw new ApiError(
        400,
        'INVALID_REFERENCE',
        'Substation does not exist.'
      );
    }

    // Generate installation ID
    const lastInstallation = await Installation
      .findOne()
      .sort({ installation_id: -1 });

    const installation_id = lastInstallation
      ? lastInstallation.installation_id + 1
      : 1;

    // Generate reference number if not provided
    const referenceNo =
      reference_no || `SL-PV-${String(installation_id).padStart(5, '0')}`;

    // Create installation
    const installation = await Installation.create({
      installation_id,
      reference_no: referenceNo,
      name,
      owner_name,
      owner_type,
      location,
      apiKey: uuidv4(),
      substation_id,
      capacity_kwp,
      inverter_capacity_kw,
      panel_wattage_w,
      commissioned_date: new Date().toISOString(),
      status
    });

    res
      .status(201)
      .set(
        'Location',
        `${req.baseUrl}/${installation.installation_id}`
      )
      .json({
        data: installation
      });

  } catch (err) {
    next(err);
  }
});

/**
 * @swagger
 * /v1/api/installation/{installationID}:
 *   get:
 *     summary: Get installation by ID
 *     description: Returns installation information together with its most recent reading.
 *     tags:
 *       - Installations
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: installationID
 *         required: true
 *         schema:
 *           type: integer
 *         description: Installation ID
 *     responses:
 *       200:
 *         description: Successfully retrieved installation
 *       304:
 *         description: Not modified
 *       404:
 *         description: Installation not found
 */
router.get('/:id', async (req, res, next) => {
  try {

    // Find installation
    const installation = await Installation.findOne({
      installation_id: req.params.id
    });

    if (!installation) {
      throw new ApiError(
        404,
        'NOT_FOUND',
        'Installation not found.'
      );
    }

    // Find substation
    const substation = await Substation.findOne({
      substation_id: installation.substation_id
    });

    if (!substation) {
      throw new ApiError(
        404,
        'NOT_FOUND',
        'Substation not found.'
      );
    }

    // Find district
    const district = await District.findOne({
      district_id: substation.district_id
    });

    if (!district) {
      throw new ApiError(
        404,
        'NOT_FOUND',
        'District not found.'
      );
    }

    // Check user's jurisdiction
    assertDistrictAllowed(
      req.user,
      district.district_id
    );

    // Get latest reading
    const lastReading = await Reading
      .findOne({
        installation_id: installation.installation_id
      })
      .sort({ timestamp: -1 });

    // Create response
    const composite = {
      ...installation.toObject(),

      substation: substation,
      district: district,

      lastReading: lastReading || null
    };

    // Never expose device API key
    delete composite.apiKey;

    sendWithConditionalGet(
      req,
      res,
      composite,
      installation.updatedAt
    );

  } catch (err) {
    next(err);
  }
});
/**
 * @swagger
 * /v1/api/installation/{installationID}:
 *   put:
 *     summary: Update an installation
 *     tags:
 *       - Installations
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: installationID
 *         required: true
 *         schema:
 *           type: string
 *         description: Installation ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               ownerName:
 *                 type: string
 *               capacityKw:
 *                 type: number
 *               status:
 *                 type: string
 *                 enum:
 *                   - active
 *                   - inactive
 *     responses:
 *       200:
 *         description: Installation successfully updated
 *       404:
 *         description: Installation not found
 */
router.put('/:id', async (req, res, next) => {
  try {
    requireNational(req);
    const installation = await Installation.findOne({installation_id : req.params.id});
    if (!installation) throw new ApiError(404, 'NOT_FOUND', 'Installation not found.');

    const { name, ownerName, capacityKw, location, status } = req.body;
    if (name !== undefined) installation.name = name;
    if (ownerName !== undefined) installation.ownerName = ownerName;
    if (capacityKw !== undefined) installation.capacityKw = capacityKw;
    if (location !== undefined) installation.location = location;
    if (status !== undefined) installation.status = status;
    await installation.save();

    const obj = installation.toObject();
    delete obj.apiKey;
    res.status(200).json(obj);
  } catch (err) {
    next(err);
  }
});

/**
 * @swagger
 * /v1/api/installation/{installationID}:
 *   delete:
 *     summary: Delete an installation
 *     tags:
 *       - Installations
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: installationID
 *         required: true
 *         schema:
 *           type: string
 *         description: Installation ID
 *     responses:
 *       204:
 *         description: Installation successfully deleted
 *       404:
 *         description: Installation not found
 */
router.delete('/:id', async (req, res, next) => {
  try {
    requireNational(req);
    const installation = await Installation.findOneAndDelete({
    installation_id: req.params.id
  });
    if (!installation) throw new ApiError(404, 'NOT_FOUND', 'Installation not found.');
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

// --- Readings sub-collection: the analytical + operational surface ---

/**
 * @swagger
 * /v1/api/installation/{installationID}/readings/last:
 *   get:
 *     summary: Get latest generation reading
 *     description: Returns the most recent generation reading for an installation.
 *     tags:
 *       - Readings
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: installationID
 *         required: true
 *         schema:
 *           type: string
 *         description: Installation ID
 *     responses:
 *       200:
 *         description: Successfully retrieved latest reading
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 _id:
 *                   type: string
 *                 installation:
 *                   type: string
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                 powerKw:
 *                   type: number
 *                   example: 3.42
 *                 energyKwh:
 *                   type: number
 *                   example: 1204.7
 *                 voltage:
 *                   type: number
 *                   example: 231.5
 *       404:
 *         description: No readings found
 */
router.get('/:id/readings/last', async (req, res, next) => {
  try {
    const installation = await Installation.findOne({installation_id: req.params.id});
    if (!installation) throw new ApiError(404, 'NOT_FOUND', 'Installation not found.');
    const districtId = await districtIdForInstallation(installation);
    assertDistrictAllowed(req.user, districtId);

    const reading = await Reading.findOne({installation: installation.installation_id}).sort({ timestamp: -1 });
    if (!reading) throw new ApiError(404, 'NOT_FOUND', 'This installation has no readings yet.');

    sendWithConditionalGet(req, res, reading.toObject(), reading.timestamp);
  } catch (err) {
    next(err);
  }
});

/**
 * @swagger
 * /v1/api/installation/{installationID}/readings:
 *   get:
 *     summary: Get generation reading history
 *     description: Returns paginated and filterable generation history for an installation.
 *     tags:
 *       - Readings
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: installationID
 *         required: true
 *         schema:
 *           type: string
 *         description: Installation ID
 *       - in: query
 *         name: from
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Start date and time
 *       - in: query
 *         name: to
 *         schema:
 *           type: string
 *           format: date-time
 *         description: End date and time
 *       - in: query
 *         name: sort
 *         schema:
 *           type: string
 *           enum:
 *             - asc
 *             - desc
 *           default: desc
 *         description: Sort readings by timestamp
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 100
 *         description: Number of readings per page
 *     responses:
 *       200:
 *         description: Successfully retrieved generation history
 */
router.get('/:id/readings', async (req, res, next) => {
  try {
    const installation = await Installation.findOne({installation_id : req.params.id});
    if (!installation) throw new ApiError(404, 'NOT_FOUND', 'Installation not found.');
    const districtId = await districtIdForInstallation(installation);
    assertDistrictAllowed(req.user, districtId);

    const { from, to, sort } = req.query;
    const filter = { installation: installation.installation_id };
    if (from || to) {
      filter.timestamp = {};
      if (from) filter.timestamp.$gte = new Date(from);
      if (to) filter.timestamp.$lte = new Date(to);
    }
    const sortOrder = sort === 'asc' ? 1 : -1; // default: newest first

    const { page, limit, skip } = parsePagination(req, 100, 1000);
    const [readings, total] = await Promise.all([
      Reading.find(filter).sort({ timestamp: sortOrder }).skip(skip).limit(limit),
      Reading.countDocuments(filter)
    ]);

    res.json({ data: readings, meta: buildPagination(req, total, page, limit) });
  } catch (err) {
    next(err);
  }
});

/**
 * @swagger
 * /v1/api/installation/{installationID}/readings:
 *   post:
 *     summary: Submit a new generation reading
 *     description: Device write path for ingesting a new solar generation reading.
 *     tags:
 *       - Readings
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: installationID
 *         required: true
 *         schema:
 *           type: string
 *         description: Installation ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - powerKw
 *               - energyKwh
 *               - voltage
 *             properties:
 *               timestamp:
 *                 type: string
 *                 format: date-time
 *               powerKw:
 *                 type: number
 *                 example: 3.42
 *               energyKwh:
 *                 type: number
 *                 example: 1204.7
 *               voltage:
 *                 type: number
 *                 example: 231.5
 *     responses:
 *       201:
 *         description: Generation reading successfully created
 *       401:
 *         description: Missing or invalid API key
 *       403:
 *         description: Device is not authorized to write to this installation
 *       404:
 *         description: Installation not found
 */
router.post('/:id/readings', deviceAuth, async (req, res, next) => {
  try {
    const { timestamp, powerKw, energyKwh, voltage } = req.body;
    const installation_id = req.params.id
    if (powerKw === undefined || energyKwh === undefined || voltage === undefined) {
      throw new ApiError(400, 'VALIDATION_ERROR', 'powerKw, energyKwh and voltage are required.');
    }
    const reading = await Reading.create({
      installation: installation_id,
      timestamp: timestamp ? new Date(timestamp) : new Date(),
      powerKw, energyKwh, voltage
    });

    res.status(201)
      .set('Location', `/api/installations/${req.installation.installation_id}/readings/${reading._id}`)
      .json(reading);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
