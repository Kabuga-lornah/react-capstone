const functions = require("firebase-functions");
const cors = require("cors")({ origin: true }); // Allow all origins
const twilio = require("twilio");

const accountSid = "your_twilio_sid";
const authToken = "your_twilio_token";
const client = new twilio(accountSid, authToken);

exports.sendAdoptionSMS = functions.https.onRequest((req, res) => {
  cors(req, res, async () => {
    const { phoneNumber, message } = req.body;

    if (!phoneNumber || !message) {
      return res.status(400).send("Missing phoneNumber or message");
    }

    try {
      await client.messages.create({
        body: message,
        to: phoneNumber,
        from: "your_twilio_verified_number"
      });

      return res.status(200).send({ success: true });
    } catch (error) {
      console.error("Twilio error:", error);
      return res.status(500).send({ error: "Failed to send SMS" });
    }
  });
});
