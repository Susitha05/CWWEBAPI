const express = require('express');
const { assertProvinceAllowed } = require('../utils/jurisdiction');
const { sendWithConditionalGet } = require('../utils/conditionalGet');

const { District, Province } = require('../model/province.js');

const router = express.Router();

function ret_province(p){
return{
    province_id: p.province_id,
    name : p.name
    };
}
function re_dist(d){
    return{
        provinve_id : d.province_id,
        dist_id: d.district_id,
        dist_name: d.name
    };
}
/**
 * @swagger
 * /v1/api/province:
 *   get:
 *     summary: Get all provinces
 *     tags:
 *       - Province
 *     security:
 *       - ApiKeyAuth: []
 *         BearerAuth: []
 *     responses:
 *       200:
 *         description: Successfully retrieved provinces
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   province_id:
 *                     type: integer
 *                   name:
 *                     type: string
 */
router.get('/', async (req, res, next) => {
    try {
        let filter = {};

        if (req.user.role === 'provincial' || req.user.role === 'district') {
            filter = {
                province_id: req.user.province
            };
        }

        const allprovince = await Province
            .find(filter)
            .sort({ name: 1 });


        return res.status(200).json({
            data: allprovince,
            meta: {
                total: allprovince.length
            }
        });
    }
    catch (e) {
        next(e);
    }
});

/**
 * @swagger
 * /v1/api/province/{provinceID}:
 *   get:
 *     summary: Get all provinces
 *     tags:
 *       - Province
 *     security:
 *         -BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: provinceID
 *         required: true
 *         schema:
 *           type: integer
 *         description: Province ID
 *     responses:
 *       200:
 *         description: Successfully retrieved province
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   province_id:
 *                     type: integer
 *                   name:
 *                     type: string
 */
router.get('/:provinceID', async (req, res, next) => {
    try {
        const id = Number(req.params.provinceID);

        if (!id) {
            return res.status(400).json({
                message: "Invalid Province ID"
            });
        }

        assertProvinceAllowed(req.user, id);

        const province = await Province.findOne({
            province_id: id
        });

        console.log("Province:", province);

        if (!province) {
            return res.status(404).json({
                message: "Province Not Found"
            });
        }

        return res.status(200).json({
            data: province
        });

    } catch (e) {
        console.log("ERROR:", e);

        return res.status(500).json({
            message: "Internal Server Error"
        });
    }
});

/**
 * @swagger
 * /v1/api/province/{provinceID}/districts:
 *   get:
 *     summary: Get all districts in provinces
 *     tags:
 *       - District
 *     security:
 *       - ApiKeyAuth: []
 *         BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: provinceID
 *         required: true
 *         schema:
 *           type: integer
 *         description: Province ID
 *     responses:
 *       200:
 *         description: Successfully retrieved province
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   province_id:
 *                     type: integer
 *                   district_id:
 *                     type: integer
 *                   name:
 *                     type: string
 */
    router.get('/:provinceID/districts',async(req,res,next)=>{
        try{
            const provinceID = Number(req.params.provinceID);
            assertProvinceAllowed(req.user, req.params.id);
            if(!provinceID) return res.status(404).json({message:"Province ID Not Foound"});

            const district = await District
                .find({province_id:provinceID})
                .sort({name: 1});

            if(!district) return res.status(404).json({message:"No districts Found"});

            return res.status(200).json({
                data: district,
                meta: { total: district.length }
            });
        }catch(err){
            next(err)
        }
    });

module.exports = router;
