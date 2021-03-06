/*!
 * Krypt
 * Copyright(c) 2014 Mike Moulton
 */

'use strict';

var crypto = require('crypto'),
    _ = require('lodash');

var CIPHER = 'aes-256-cbc',
    KEY_DERIVATION = 'pbkdf2',
    DEFAULT_KEY_LENGTH = 256,
    DEFAULT_ITERATIONS = 64000;


module.exports = new Krypt();
exports.Krypt = Krypt;


function Krypt(config) {
  if (!(this instanceof Krypt)) {
    return new Krypt(config);
  }

  config = config || {};

  this.iterations = config.iterations || DEFAULT_ITERATIONS;
  this.keyLength = config.keyLength || DEFAULT_KEY_LENGTH;
  this.defaultSecret = config.secret;
  this.context = config.context || {};
}


Krypt.prototype.setSecret = function setSecret(secret) {
  this.defaultSecret = secret;
};


Krypt.prototype.setIterations = function setIterations(iterations) {
  this.iterations = iterations;
};

Krypt.prototype.setKeyLength = function setKeyLength(keyLength) {
  this.keyLength = keyLength;
};

Krypt.prototype.setContext = function setContext(context) {
  this.context = context;
};


Krypt.prototype.encrypt = function encrypt(input, secret) {

  if (!input) {
    throw new Error('You must provide a value to encrypt');
  }

  secret = secret || this.defaultSecret;
  if (!secret) {
    throw new Error('A \'secret\' is required to encrypt');
  }

  // Legacy check to deal with old versions that recorded key length in Bytes
  if (this.keyLength === 32) {
    this.keyLength = this.keyLength * 8;
  }

  var salt = crypto.randomBytes(this.keyLength / 8),
      iv = crypto.randomBytes(16);

  try {

    var key = crypto.pbkdf2Sync(secret, salt, this.iterations, this.keyLength / 8),
        cipher = crypto.createCipheriv(CIPHER, key, iv);

    var encryptedValue = cipher.update(input, 'utf8', 'base64');
    encryptedValue += cipher.final('base64');

    var result = {
      cipher: CIPHER,
      keyDerivation: KEY_DERIVATION,
      keyLength: this.keyLength,
      iterations: this.iterations,
      iv: iv.toString('base64'),
      salt: salt.toString('base64'),
      value: encryptedValue
    };

    _.defaults(result, this.context);

    return result;

  } catch (err) {
    throw new Error('Unable to encrypt value due to: ' + err);
  }

};


Krypt.prototype.decrypt = function decrypt(input, secret) {

  // Ensure we have something to decrypt
  if (!input) {
    throw new Error('You must provide a value to decrypt');
  }

  // Ensure we have the secret used to encrypt this value
  secret = secret || this.defaultSecret;
  if (!secret) {
    throw new Error('A \'secret\' is required to decrypt');
  }

  // If we get a string as input, turn it into an object
  if (typeof input !== 'object') {
    try {
      input = JSON.parse(input);
    } catch (err) {
      throw new Error('Unable to parse string input as JSON');
    }
  }

  // Ensure our input is a valid object with 'iv', 'salt', and 'value'
  if (!input.iv || !input.salt || !input.value) {
    throw new Error('Input must be a valid object with \'iv\', \'salt\', and \'value\' properties');
  }

  var salt = new Buffer(input.salt, 'base64'),
      iv = new Buffer(input.iv, 'base64'),
      keyLength = input.keyLength || this.keyLength,
      iterations = input.iterations || this.iterations;

  // Legacy check to deal with old versions that recorded key length in Bytes
  if (keyLength === 32) {
    keyLength = keyLength * 8;
  }

  try {

    var key = crypto.pbkdf2Sync(secret, salt, iterations, keyLength / 8),
        decipher = crypto.createDecipheriv(CIPHER, key, iv);

    var decryptedValue = decipher.update(input.value, 'base64', 'utf8');
    decryptedValue += decipher.final('utf8');

    return decryptedValue;

  } catch (err) {
    throw new Error('Unable to decrypt value due to: ' + err);
  }

};


Krypt.prototype.encryptAsync = function encryptAsync(input, secret, cb) {

  if (!input) {
    cb(new Error('You must provide a value to encrypt'));
    return;
  }

  secret = secret || this.defaultSecret;
  if (!secret) {
    cb(new Error('A \'secret\' is required to encrypt'));
    return;
  }

  // Legacy check to deal with old versions that recorded key length in Bytes
  if (this.keyLength === 32) {
    this.keyLength = this.keyLength * 8;
  }

  var salt = crypto.randomBytes(this.keyLength / 8),
      iv = crypto.randomBytes(16);

  crypto.pbkdf2(secret, salt, this.iterations, this.keyLength / 8, function(err, key) {
    if (err) {
      cb(new Error('Unable to encrypt value due to: ' + err));
      return;
    }

    try {
      var cipher = crypto.createCipheriv(CIPHER, key, iv);

      var encryptedValue = cipher.update(input, 'utf8', 'base64');
      encryptedValue += cipher.final('base64');

      var result = {
        cipher: CIPHER,
        keyDerivation: KEY_DERIVATION,
        keyLength: this.keyLength,
        iterations: this.iterations,
        iv: iv.toString('base64'),
        salt: salt.toString('base64'),
        value: encryptedValue
      };

      _.defaults(result, this.context);

      cb(null, result);

    } catch (err) {
      cb(new Error('Unable to encrypt value due to: ' + err));
    }
  });

};


Krypt.prototype.decryptAsync = function decrypt(input, secret, cb) {

  // Ensure we have something to decrypt
  if (!input) {
    cb(new Error('You must provide a value to decrypt'));
    return;
  }

  // Ensure we have the secret used to encrypt this value
  secret = secret || this.defaultSecret;
  if (!secret) {
    cb(new Error('A \'secret\' is required to decrypt'));
    return;
  }

  // If we get a string as input, turn it into an object
  if (typeof input !== 'object') {
    try {
      input = JSON.parse(input);
    } catch (err) {
      cb(new Error('Unable to parse string input as JSON'));
      return;
    }
  }

  // Ensure our input is a valid object with 'iv', 'salt', and 'value'
  if (!input.iv || !input.salt || !input.value) {
    cb(new Error('Input must be a valid object with \'iv\', \'salt\', and \'value\' properties'));
    return;
  }

  var salt = new Buffer(input.salt, 'base64'),
      iv = new Buffer(input.iv, 'base64'),
      keyLength = input.keyLength || this.keyLength,
      iterations = input.iterations || this.iterations;

  // Legacy check to deal with old versions that recorded key length in Bytes
  if (keyLength === 32) {
    keyLength = keyLength * 8;
  }

  crypto.pbkdf2(secret, salt, iterations, keyLength / 8, function(err, key) {
    if (err) {
      cb(new Error('Unable to decrypt value due to: ' + err));
      return;
    }

    try {

      var decipher = crypto.createDecipheriv(CIPHER, key, iv);

      var decryptedValue = decipher.update(input.value, 'base64', 'utf8');
      decryptedValue += decipher.final('utf8');

      cb(null, decryptedValue);

    } catch (err) {
      cb(new Error('Unable to decrypt value due to: ' + err));
      return;
    }
  });

};
