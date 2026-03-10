const express = require('express');
const { MongoClient } = require('mongodb');
const router = express.Router();
const UserConnection = require('../models/UserConnection');
const { decrypt } = require('../utils/encryption');

// 1. GET /api/db/explore/collections
router.get('/explore/collections', async (req, res) => {
  let client;
  try {
    const { connectionId } = req.query;

    if (!connectionId) {
      return res.status(400).json({ message: 'Connection ID is required' });
    }

    const connection = await UserConnection.findById(connectionId);
    if (!connection) {
        return res.status(404).json({ message: 'Connection not found' });
    }
    
    // Decrypt config
    const decryptedConfig = decrypt({ content: connection.encryptedConfig, iv: connection.iv });
    const config = JSON.parse(decryptedConfig);
    const connectionString = config.connectionUri;

    if (!connectionString) {
        return res.status(400).json({ message: 'Invalid connection configuration' });
    }

    client = new MongoClient(connectionString);
    await client.connect();

    const db = client.db(); // Connects to the database specified in the URI
    const collections = await db.listCollections().toArray();

    // extract just names for the sidebar? or return full info
    const collectionNames = collections.map(c => c.name).sort();

    res.json({ collections: collectionNames });
  } catch (error) {
    console.error('Error fetching collections:', error);
    res.status(500).json({ message: 'Failed to fetch collections', error: error.message });
  } finally {
    if (client) await client.close();
  }
});

// 2. POST /api/db/explore/documents
router.post('/explore/documents', async (req, res) => {
  let client;
  try {
    const { connectionId, collectionName } = req.body;

    if (!connectionId || !collectionName) {
      return res.status(400).json({ message: 'Connection ID and collection name are required' });
    }

    const connection = await UserConnection.findById(connectionId);
    if (!connection) {
        return res.status(404).json({ message: 'Connection not found' });
    }
    
    // Decrypt config
    const decryptedConfig = decrypt({ content: connection.encryptedConfig, iv: connection.iv });
    const config = JSON.parse(decryptedConfig);
    const connectionString = config.connectionUri;

    client = new MongoClient(connectionString);
    await client.connect();

    const db = client.db();
    const collection = db.collection(collectionName);

    const documents = await collection.find({})
      .limit(50)
      .toArray();

    res.json({ documents });
  } catch (error) {
    console.error('Error fetching documents:', error);
    res.status(500).json({ message: 'Failed to fetch documents', error: error.message });
  } finally {
    if (client) await client.close();
  }
});

module.exports = router;