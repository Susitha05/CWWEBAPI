const express = require('express');
const Station = require('../model/station');
const Installation = require('../model/installation');
const { ApiError } = require('../middleware/errorHandler');
const { assertDistrictAllowed } = require('../utils/jurisdiction');
const { sendWithConditionalGet } = require('../utils/conditionalGet');

const router = express.Router();
/**
 * @swagger
 * /v1/api/substation/{substationID}:
 *   get:
 *     summary: Get substation by ID
 *     tags:
 *       - Substations
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: substationID
 *         required: true
 *         schema:
 *           type: string
 *         description: Substation ID
 *     responses:
 *       200:
 *         description: Successfully retrieved substation
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 _id:
 *                   type: string
 *                 name:
 *                   type: string
 *                 code:
 *                   type: string
 *                 district:
 *                   type: string
 *                 capacityMw:
 *                   type: number
 *                   nullable: true
 *       404:
 *         description: Substation not found
 */

router.get('/:id', async (req, res, next) => {
  try {
    console.log('/:id');
    const substation = await Station.findOne({substation_id : req.params.id});
    if (!substation) throw new ApiError(404, 'NOT_FOUND', 'Substation not found.');
    assertDistrictAllowed(req.user, substation.district);
    sendWithConditionalGet(req, res, substation.toObject(), substation.updatedAt);
  } catch (err) {
    next(err);
  }
});

/**
 * @swagger
 * /v1/api/substation/{substationID}/installations:
 *   get:
 *     summary: Get installations by substation
 *     tags:
 *       - Installations
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: substationID
 *         required: true
 *         schema:
 *           type: string
 *         description: Substation ID
 *     responses:
 *       200:
 *         description: Successfully retrieved installations
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   _id:
 *                     type: string
 *                   name:
 *                     type: string
 *                   meterId:
 *                     type: string
 *                     example: MTR-000123
 *                   substation:
 *                     type: string
 *                   ownerName:
 *                     type: string
 *                   capacityKw:
 *                     type: number
 *                   status:
 *                     type: string
 *                     enum:
 *                       - active
 *                       - inactive
 *       404:
 *         description: Substation not found
 */
router.get('/:id/installations', async (req, res, next) => {
  try {
    console.log('/:id/installations');
     console.log(req.params.id);
    const substation = await Station.findOne({substation_id : req.params.id});

    if (!substation) throw new ApiError(404, 'NOT_FOUND', 'Substation not found.');
    assertDistrictAllowed(req.user, substation.district);
    const installations = await Installation.find({  substation_id : substation.substation_id}).sort({ name: 1 });
    res.json({ data: installations, meta: { total: installations.length } });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
