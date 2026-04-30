const functions = require('firebase-functions');
const cors = require('cors')({origin: true}); 
const accountSid = functions.config().twilio.accountsid;
const authToken = functions.config().twilio.authtoken;
const client = require('twilio')(accountSid, authToken);

exports.sendAdoptionSMS = functions.https.onRequest((request, response) => {
    cors(request, response, () => { 

        const { phoneNumber, message } = request.body;

        client.messages
            .create({
                body: message,
                to: phoneNumber,
                from: '+18666394834'
            })
            .then(message => {
                console.log(message.sid)
                response.status(200).send({ success: true, message: 'SMS sent successfully!' });
            })
            .catch(error => {
                console.error(error);
                response.status(500).send({ success: false, message: 'SMS failed to send.' });
            });
    });
});
