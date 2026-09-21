const {MongoClient} = require("mongodb");
const fs = require('fs');
const dns = require('dns');
require('dotenv').config();
const cors = require('cors')

dns.setServers(['8.8.8.8','1.1.1.1']);

async function seedData(){
    const Mconnection = new MongoClient(`mongodb+srv://${process.env.MONGODB_USERNAME}:${process.env.MONGODB_PASSWORD}@cluster0.potyfwz.mongodb.net`)

    try{
        await Mconnection.connect();
        const db = Mconnection.db('solargenaration')

        const data = JSON.parse(fs.readFileSync('./seed.json','utf-8'));

        for(const[collectionName,documents] of Object.entries(data)){
            const collection = db.collection(collectionName);
            const result = await collection.insertMany(documents)
            console.log(`✅ ${collectionName}: inserted ${result.insertedCount} documents`);

        }
    }
    finally{
       await Mconnection.close();
    }
}

seedData().catch(console.error)