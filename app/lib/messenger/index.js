if (process.env.NODE_ENV === 'production') {
  var twilio = require('twilio')(process.env.TWILIO_ACCOUNT_ID, process.env.TWILIO_AUTH_TOKEN);
  var phoneNumber = process.env.TWILIO_PHONE_NUMBER;

  module.exports = {
    send: function (number, message) {
      if (number.match(/demo/)) { console.log('SMS:', message); return; };
      twilio.sms.messages.create({
        body: message,
        to: number,
        from: phoneNumber
      }, function(err, message) {
        if (err) console.log(err);
        console.log(message.sid);
      });
    },
    fail: function (number) {
      twilio.sms.messages.create({
        body: 'An error has occured. We\'re looking into it. Please try again later.',
        to: number,
        from: phoneNumber
      }, function(err, message) {
        console.log(message.sid);
      });
    }
  };
} else {
  module.exports = {
    send: function (number, message) {
      console.log('SMS:', message);
    }
  }
}