const express = require('express');
const JWT = require('jsonwebtoken');
const dotenv = require('dotenv');
const User = require('../model/user');
const bcrypt = require('bcrypt');

dotenv.config();

const router = express.Router();
/**
 * @swagger
 * /v1/api/login:
 *   post:
 *     tags:
 *       - Auth
 *     summary: SLSEA user login
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - password
 *             properties:
 *               username:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       '200':
 *         description: JWT issued
 *       '401':
 *         description: Invalid credentials
 */

router.post('/',async(req,res,next)=>{
try{
    const { username, password } = req.body;
    if (!username || !password) {
      res.status(404).json({
        message:"INVALID_CREDENTIALS Not found"
      });
    }
    const user = await User.findOne({ username });
    const expieresIn = process.env.JWTEXP
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
        res.status(401).json({
            message:"INVALID_CREDENTIALS Incorrect"
      });
    }
        const token = JWT.sign(
        {
            id: user._id,
            username: user.username,
            role: user.role,
            province: user.jurisdiction.province,
            district: user.jurisdiction.district
        },
            process.env.JWT_SECRET,
            {expiresIn: expieresIn}
        )
    res.json({ token, role: user.role, expiresIn: expieresIn });
}
catch(e){
    console.log(e)
    return res.status(500).json({
        message:"Intrnal Server Eroor"
    })
}
});

module.exports = router;