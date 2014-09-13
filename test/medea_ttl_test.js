var assert = require('assert');
var medea = require('medea');
var ttl = require('../');

describe('MedeaTtl', function() {
  var db = ttl(medea());
  var dir = __dirname + '/tmp/medea_ttl_test';

  before(function(done) {
    db.open(dir, done);
  });

  it('should assign itself to db._ttl', function() {
    assert(!!db._ttl);
  });

  describe('#open', function() {
    it('should start the cleanup interval', function() {
      assert(!!db._ttl.interval);
    });
  });

  describe('#close', function() {
    it('should stop the cleanup interval', function(done) {
      db.close(function() {
        assert(!!db._ttl.interval);
        db.open(dir, done);
      });
    });
  });

  describe('#put', function() {
    it('should take a ttl parameter', function(done) {
      db.put('hello', 'world', 1, function(err, val) {
        assert(!err);
        done();
      });
    });
  });

  describe('#get', function() {
    it('should return a fresh value', function(done) {
      db.put('hello', 'world', 100, function(err, val) {
        setTimeout(function() {
          db.get('hello', function(err, val) {
            assert(!err);
            assert.equal(val, 'world');
            done();
          });
        }, 50);
      });
    });

    it('should not return an expired value', function(done) {
      db.put('hello', 'world', 50, function(err, val) {
        setTimeout(function() {
          db.get('hello', function(err, val) {
            assert(!err);
            assert(!val);
            done();
          });
        }, 50);
      });
    });
  });

  describe('#remove', function() {
    it('should auto-expire a ttl value', function(done) {
      db.put('hello', 'world', 10000, function(err, val) {
        db.remove('hello', function(err) {
          db.get('hello', function(err, val) {
            assert(!err);
            assert(!val);
            done();
          });
        });
      });
    });
  });
});
