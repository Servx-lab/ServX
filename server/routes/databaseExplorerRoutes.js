const express = require('express');
const { MongoClient } = require('mongodb');
const router = express.Router();
const UserConnection = require('../models/UserConnection');
const { decrypt } = require('../utils/encryption');
const requireAuth = require('../middleware/requireAuth');

// Helper: get connection string from a saved connection securely
async function getConnectionString(connectionId, ownerUid) {
    const connection = await UserConnection.findOne({ _id: connectionId, ownerUid });
    if (!connection) throw new Error('Connection not found or access denied');
    const decryptedConfig = decrypt({ content: connection.encryptedConfig, iv: connection.iv });
    const config = JSON.parse(decryptedConfig);
    if (!config.connectionUri) throw new Error('Invalid connection configuration');
    return config.connectionUri;
}

// 1. GET /api/db/explore/databases - List all databases on the cluster
router.get('/explore/databases', requireAuth, async (req, res) => {
  let client;
  try {
    const { connectionId } = req.query;
    if (!connectionId) return res.status(400).json({ message: 'Connection ID is required' });

    const connectionString = await getConnectionString(connectionId, req.user.uid);
    client = new MongoClient(connectionString);
    await client.connect();

    const adminDb = client.db().admin();
    const result = await adminDb.listDatabases();
    const databases = result.databases
      .map(db => ({ name: db.name, sizeOnDisk: db.sizeOnDisk }))
      .sort((a, b) => a.name.localeCompare(b.name));

    res.json({ databases });
  } catch (error) {
    console.error('Error fetching databases:', error);
    res.status(500).json({ message: 'Failed to fetch databases', error: error.message });
  } finally {
    if (client) await client.close();
  }
});

// 2. GET /api/db/explore/collections?connectionId=...&dbName=...
router.get('/explore/collections', requireAuth, async (req, res) => {
  let client;
  try {
    const { connectionId, dbName } = req.query;
    if (!connectionId || !dbName) {
      return res.status(400).json({ message: 'Connection ID and database name are required' });
    }

    const connectionString = await getConnectionString(connectionId, req.user.uid);
    client = new MongoClient(connectionString);
    await client.connect();

    const db = client.db(dbName);
    const collections = await db.listCollections().toArray();
    const collectionNames = collections.map(c => c.name).sort();

    res.json({ collections: collectionNames });
  } catch (error) {
    console.error('Error fetching collections:', error);
    res.status(500).json({ message: 'Failed to fetch collections', error: error.message });
  } finally {
    if (client) await client.close();
  }
});

// 3. POST /api/db/explore/documents
router.post('/explore/documents', requireAuth, async (req, res) => {
  let client;
  try {
    const { connectionId, dbName, collectionName } = req.body;
    if (!connectionId || !dbName || !collectionName) {
      return res.status(400).json({ message: 'Connection ID, database name, and collection name are required' });
    }

    const connectionString = await getConnectionString(connectionId, req.user.uid);
    client = new MongoClient(connectionString);
    await client.connect();

    const db = client.db(dbName);
    const collection = db.collection(collectionName);
    const documents = await collection.find({}).limit(50).toArray();

    res.json({ documents });
  } catch (error) {
    console.error('Error fetching documents:', error);
    res.status(500).json({ message: 'Failed to fetch documents', error: error.message });
  } finally {
    if (client) await client.close();
  }
});

module.exports = router;