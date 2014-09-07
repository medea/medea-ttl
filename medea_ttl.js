var bufferEqual = require('buffer-equal');

module.exports = function(db, options) {
  new MedeaTtl(db, options);
  return db;
};

var MedeaTtl = function(db, options) {
  if (!(this instanceof MedeaTtl)) {
    return new MedeaTtl(db);
  }

  options = options || {};

  this.db = db;
  this.frequency = options.frequency || 5 * 60 * 1000;
  this.prefix = options.prefix || 'ttl-';

  this.interval = null;

  this._wrap();
};

MedeaTtl.prototype.startInterval = function() {
  var self = this;
  this.interval = setInterval(function() {
    self.db.listKeys(function(err, keys) {
      var remove = [];
      var getting = 0;
      var found = 0;

      keys.forEach(function(key) {
        if (key.slice(0, self.prefix.length) === self.prefix) {
          var actual = key.slice(self.prefix.length);
          getting++;
          self.db.get(key, function(err, val) {
            if (!val) {
              found++;
              if (found === getting) {
                remove.forEach(function(key) {
                  self.db.remove(key);
                });
                remove = [];
              }
              return;
            }
            if (Date.now() >= parseInt(val.toString())) {
              remove.push(actual);
            }

            found++;
            if (found === getting) {
              remove.forEach(function(key) {
                self.db.remove(key);
              });
              remove = [];
            }
          });
        }
      });

    });
  }, this.frequency);
};

MedeaTtl.prototype.stopInterval = function() {
  clearInterval(this.interval);
};

MedeaTtl.prototype._wrap = function() {
  this._wrapOpen();
  this._wrapGet();
  this._wrapPut();
  this._wrapRemove();
};

MedeaTtl.prototype._wrapOpen = function() {
  var _open = this.db.open.bind(this.db);

  var self = this;
  this.db.open = function() {
    var args = Array.prototype.slice.call(arguments);

    if (args.length && (typeof args[args.length - 1] === 'function')) {
      var cb = args.pop();
      args.push(function(err) {
        if (!err) {
          self.startInterval();
        }

        cb(err);
      });
    }

    _open.apply(self.db, args);
  };
};

MedeaTtl.prototype._wrapGet = function() {
  var _get = this.db.get.bind(this.db);
  
  var self = this;
  this.db.get = function(key, snapshot, callback) {
    if (!callback) {
      callback = snapshot;
      snapshot = undefined;
    }

    if (snapshot) {
      _get(key, snapshot, callback);
      return;
    }

    var prefixed = self.prefix + key;
    if (self.db.keydir[prefixed]) {
      _get(prefixed, function(err, val) {
        if (err) {
          callback(err);
          return;
        }

        if (val) {
          if (Date.now() >= parseInt(val.toString())) {
            self.db.remove(prefixed, function(err) {
              if (err) {
                callback(err);
                return;
              }
              self.db.remove(key, function(err) {
                if (err) {
                  callback(err);
                }
                callback();
              });
            });
          } else {
            _get(key, snapshot, callback);
          }
        } else {
          _get(key, snapshot, callback);
        }
      });
    } else {
      _get(key, snapshot, callback);
    }

  };
};

MedeaTtl.prototype._wrapPut = function() {
  var _put = this.db.put.bind(this.db);

  var self = this;
  this.db.put = function(key, value, ttl, callback) {
    if (typeof ttl === 'function') {
      callback = ttl;
      ttl = null;
    }

    if (bufferEqual(value, new Buffer('medea_tombstone'))) {
      _put(key, value, callback);
      return;
    }

    var prefixed = self.prefix + key;

    if ((ttl === null || ttl === undefined) && self.db.keydir[prefixed]) {
      self.db.remove(prefixed, function(err) {
        if (err) {
          callback(err);
          return;
        }

        _put(key, value, callback);
      });
    } else {
      var expiry = Date.now() + ttl;
      _put(self.prefix + key, expiry, function(err) {
        if (err) {
          callback(err);
          return;
        }

        _put(key, value, callback);
      });
    }
  };
};

MedeaTtl.prototype._wrapRemove = function() {
  var _remove = this.db.remove.bind(this.db);

  var self = this;
  this.db.remove = function(key, callback) {
    if (!self.db.keydir[key]) {
      if (callback) callback();
      return;
    }

    if (key.slice(0, self.prefix.length) === self.prefix) {
      actual();
      return;
    }

    var prefixed = self.prefix + key;
    if (self.db.keydir[prefixed]) {
      _remove(prefixed, function(err) {
        if (err) {
          callback(err);
          return;
        }
      });

      actual();
    } else {
      actual();
    }

    function actual() {
      _remove(key, callback);
    };
  };
};
