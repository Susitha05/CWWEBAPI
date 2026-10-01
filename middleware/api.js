const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
const Installation = require('../model/installation')

dotenv.config();

async function deviceAuth(req, res, next) {
  try {
    const apiKey = req.header("X-API-KEY");
    console.log(apiKey);
    if (!apiKey) {
      return res.status(401).json({ error: "API key missing" });
    }

    const installation = await Installation.find({apiKey: apiKey});
    console.log(installation);

    if (!installation) {
      return res.status(401).json({ error: "Invalid API key" });
    }

    if (String(installation.installation_id) !== String(req.params.installation_id)) {
      return res.status(403).json({ error: "Unauthorized access" });
    }

    req.installation = installation;
    next();
  } catch (err) {
    next(err);
  }
}

async function userAuth(req,res,next){
    try{
        const autHeader = req.header('Authorization');
        console.log(req.header);
        console.log(autHeader);

        if(!autHeader){
            return res.status(403).json({
                message:"No token Provide"
            });
        }
        
        const token = autHeader.split(" ")[1];
        console.log(token)

        const payload = jwt.verify(
            token,
            process.env.JWT_SECRET
        );
        req.user = payload;
        next();
    }
    catch(e){
        console.log(e)
        if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
            return res.status(401).json({
                message:"Token Expired"
            });
        }
    next(err);
    }
}

module.exports = {deviceAuth,userAuth};