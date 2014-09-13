# medea-ttl

Set a time-to-live (TTL) for key-value pairs in [medea](https://github.com/medea/medea).

[![Build Status](https://api.travis-ci.org/medea/medea-ttl.svg?branch=master)](https://travis-ci.org/medea/medea-ttl)

## Example

```js
var medea = require('medea');
var ttl = require('medea_ttl');

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
```

## Usage

### ttl(db, options)

Wrap an existing medea instance.


```js
var medea = require('medea');
var ttl = require('medea_ttl');

var db = ttl(medea());
```

The `options` object is optional.  Supported options:

`frequency` - This module uses a cleanup interval executing at a frequency specified by this option.  The cleanup interval will clear out expired values from the data store.  The default is 5 minutes.

`prefix` - This option represents how TTL entries are prefixed in the database.  The default is `ttl-`.

### put(key, value, ttl, cb)

The signature for `put` is augmented to add a `ttl` parameter.  The `ttl` parameter should be expressed in milliseconds.  It is optional.

## Notes

* If values are expired between cleanup intervals, calls to `get` will remove the expired value and return null.
* Batches do not currently support a TTL parameter, though they may in the future.

## License

MIT
