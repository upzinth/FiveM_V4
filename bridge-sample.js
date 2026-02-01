const express = require('express');
const axios = require('axios');
const admin = require('firebase-admin');

// --- FIREBASE ADMIN SDK SETUP ---
// You need to download your service account key from Firebase Console
// const serviceAccount = require('./serviceAccountKey.json');
// admin.initializeApp({
//   credential: admin.credential.cert(serviceAccount),
//   databaseURL: "https://YOUR_PROJECT_ID.firebaseio.com"
// });

const db = admin.firestore();
const app = express();
app.use(express.json());

const FIVE_M_SERVER_URL = "http://your-fivem-server-ip:30120";
const SECRET_KEY = "your_shared_secret";

/**
 * Listen for purchase events in Firestore.
 * In a real production environment, you would use Cloud Functions for Firebase
 * to trigger this automatically when a document is added to the 'transactions' collection.
 */
const watchTransactions = () => {
    console.log("Listening for new transactions...");

    // This is a simplified example. In production, you'd use a more robust
    // query to only catch NEW, un-processed transactions.
    db.collectionGroup('transactions')
        .onSnapshot(snapshot => {
            snapshot.docChanges().forEach(change => {
                if (change.type === 'added') {
                    const transaction = change.doc.data();
                    if (!transaction.processed) {
                        console.log(`Processing purchase: ${transaction.itemName} for user ${change.doc.ref.parent.parent.id}`);
                        triggerFiveMCommand(transaction, change.doc.ref);
                    }
                }
            });
        });
};

const triggerFiveMCommand = async (tx, docRef) => {
    try {
        // Call your FiveM server resource's HTTP API
        const response = await axios.post(`${FIVE_M_SERVER_URL}/purchase_trigger`, {
            secret: SECRET_KEY,
            playerSteamId: tx.steamId, // Ensure steamId is logged in transaction
            item: tx.itemName,
            itemId: tx.itemId
        });

        if (response.status === 200) {
            console.log("FiveM server accepted the command.");
            // Mark as processed so it doesn't trigger again
            await docRef.update({ processed: true, processedAt: admin.firestore.FieldValue.serverTimestamp() });
        }
    } catch (err) {
        console.error("Error triggering FiveM command:", err.message);
    }
};

app.listen(3000, () => {
    console.log("Backend bridge running on port 3000");
    // watchTransactions(); // Uncomment to start watching
});
