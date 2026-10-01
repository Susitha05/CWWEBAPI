const express = require('express');
const cors = require('cors');
const province = require('./routers/province.js');
const auth = require('./routers/auth.js');
const disct = require('./routers/disct.js');
const substation = require('./routers/substation.js');
const installation = require('./routers/installation.js');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./swagger.js');
const { connectDB } = require('./db.js');
const{userAuth} = require('./middleware/api.js');

const app = express();
const PORT = process.env.PORT || 5000;
app.use(cors());
app.use(express.json());

app.use('/v1/api/login',auth);
app.use('/v1/api/province',userAuth,province);
app.use('/v1/api/district',userAuth,disct);
app.use('/v1/api/substation', userAuth, substation);
app.use('/v1/api/installation', (req, res, next) => {
  // Device writes carry an x-api-key and skip user JWT auth; everything else needs it.
  if (req.method === 'POST' && req.path.endsWith('/readings')) return next();
  return userAuth(req, res, next);
}, installation);

app.use(
    '/api-doc',
    swaggerUi.serve,
    swaggerUi.setup(swaggerSpec)
);

async function startServer() {
  try {
    await connectDB();
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });
  } catch (err) {
    console.error('❌ Failed to start server:', err.message);
    process.exit(1);
  }
}
startServer();


