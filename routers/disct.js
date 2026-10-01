const express = require('express');
const apikey = require('../middleware/api.js');
const { District } = require('../model/province.js');

const router = express.Router();

/**
 * @swagger
 * /v1/api/district:
 *   get:
 *     summary: Get all districts
 *     tags:
 *       - District
 *     security:
 *       - ApiKeyAuth: []
 *         BearerAuth: []
 *     responses:
 *       200:
 *         description: Successfully retrieved districts
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   district_id:
 *                     type: integer
 *                   name:
 *                     type: string
 */

router.get('/',async(req,res)=>{
    try{
    const district = await District.find()
    if(!district){
        return res.status(401).json({
            message:'Data Not Found'
        });
    }
    return res.status(200).json({
        data:district
    });
}
catch(e){
    console.log(e)
    return res.status(500).json({message:"Internal Server Error"});
}
});

/**
 * @swagger
 * /v1/api/district/{district_id}:
 *   get:
 *     summary: Get district
 *     tags:
 *       - District
 *     security:
 *       - ApiKeyAuth: []
 *         BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: district_id
 *         required: true
 *         schema:
 *           type: integer
 *         description: District ID
 *     responses:
 *       200:
 *         description: Successfully retrieved district
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

router.get('/:district_id',async(req,res)=>{
    try{
    const districtID = Number(req.params.district_id);

    console.log(districtID)
    if(!districtID) return res.status(404).json({message:'District ID Not Found'});

    const district = await District.findOne({district_id:districtID})
    if(!district){
        return res.status(401).json({
            message:'Data Not Found'
        });
    }

    return res.status(200).json({
        data:district
    });
}
catch(e){
    console.log(e);
    return res.status(500).json({message:"Internal Server Error"});
}
});



module.exports = router;