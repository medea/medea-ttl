var medea = require('medea');
var ttl = require('./medea_ttl');

var db = ttl(medea());

db.open('./.data', function(err) {
  db.put('hello', 'world', 2000, function(err) {
    if (err) {
      console.error(err);
    }
    setInterval(function() {
      db.get('hello', function(err, val) {
        console.log('value:', val);
      });
    }, 500);
  });
});

['SIGINT', 'SIGTERM'].forEach(function(signal) {
  process.on(signal, function() {
    db.close(process.exit);
  });
});
