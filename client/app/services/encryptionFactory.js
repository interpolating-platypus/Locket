// Factory for client-side encryption of messages, using OpenPGP.js
angular.module('Locket.encryptionFactory', [])

.factory('encryptionFactory', function ($window) {

  // Generate a random id and random passphrase for a user by populating an array with randomized integers and joining the elements
  var generateOptions = function (n) {
    var randomIdArray = new Uint32Array(n);
    var randomIdValues = window.crypto.getRandomValues(randomIdArray);
    var randomId = '';
    // Manual join function, since Safari doesn't provide any of the normal array methods on Uint32Arrays
    for(var i = 0; i < randomIdValues.length; i++){
      randomId += randomIdValues[i];
    }

    var randomPassphraseArray = new Uint32Array(n);
    var randomPassphraseValues = window.crypto.getRandomValues(randomPassphraseArray);
    var randomPassphrase = '';
    // Manual join function, since Safari doesn't provide any of the normal array methods on Uint32Arrays
    for(var i = 0; i < randomPassphraseValues.length; i++){
      randomPassphrase += randomPassphraseValues[i];
    }

    // Return an options object so that id and passphrase can be referenced in other functions
    var options = {
      numBits: 2048,
      userId: randomId,
      passphrase: randomPassphrase
    };

    return options;
  };

  // Call generateOptions so that other functions can reference the options object with a consistent id and passphrase during a user session
  var options = generateOptions(10);
  
  // Generate the public and private keypair and return a promise that returns an object with the public and private keys
  var generateKeyPair = function () {
    var keyring = {};
    
    return openpgp.generateKeyPair(options)
    .then(function (keypair) {
      keyring.privkey = keypair.privateKeyArmored;
      keyring.pubkey = keypair.publicKeyArmored;
    }).then(function () {
      return keyring;
    }).catch(function (error) {
      console.error(error);
    });
  };

  // Encrypt a message using a given public key and return a promise that returns the encrypted message
  var encryptMessage = function (keyring, message) {
    var pubKey = keyring.pubkey;
    return openpgp.encryptMessage(openpgp.key.readArmored(pubKey).keys, message)
    .then(function (pgpMessage) {
      return pgpMessage;
    });
  };

  // Decrypt a message using a user's private key and passphrase, returning a promise that returns a plaintext message
  var decryptMessage = function (keyring, pgpMessage) {
    var privKey = keyring.privkey;
    var privateKey = openpgp.key.readArmored(privKey).keys[0];
    privateKey.decrypt(options.passphrase);
    pgpMessage = openpgp.message.readArmored(pgpMessage);

    return openpgp.decryptMessage(privateKey, pgpMessage).then(function (plaintext) {
      return plaintext;
    });
  };

  return {
    generateKeyPair: generateKeyPair,
    encryptMessage: encryptMessage,
    decryptMessage: decryptMessage
  };

});