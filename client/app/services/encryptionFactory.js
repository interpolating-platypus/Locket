angular.module('Locket.encryptionFactory', [])

.factory('encryptionFactory', function ($window) {

  var generateOptions = function (n) {
    var randomIdArray = new Uint32Array(n);
    var randomId = $window.crypto.getRandomValues(randomIdArray).join('');
    var randomPassphraseArray = new Uint32Array(n);
    var randomPassphrase = $window.crypto.getRandomValues(randomPassphraseArray).join('');
    console.log('random id', randomId);
    console.log('random passphrase', randomPassphrase);

    var options = {
      numBits: 2048,
      userId: randomId,
      passphrase: randomPassphrase
    };

    return options;
  };

  var options = generateOptions(10);
  
  var generateKeyPair = function () {
    var keyring = {};
    
    return openpgp.generateKeyPair(options)
    .then(function (keypair) {
      keyring.privkey = keypair.privateKeyArmored;
      keyring.pubkey = keypair.publicKeyArmored;
    }).then(function () {
      return keyring;
    }).catch(function (error) {
      // failure
    });
  };

  var encryptMessage = function (keyring, message) {
    var pubKey = keyring.pubkey;
    return openpgp.encryptMessage(openpgp.key.readArmored(pubKey).keys, message)
    .then(function (pgpMessage) {
      // console.log('encrypted message sent', pgpMessage);
      return pgpMessage;
    });
  };

  var decryptMessage = function (keyring, pgpMessage) {
    var privKey = keyring.privkey;
    var privateKey = openpgp.key.readArmored(privKey).keys[0];
    privateKey.decrypt(options.passphrase);
    pgpMessage = openpgp.message.readArmored(pgpMessage);

    return openpgp.decryptMessage(privateKey, pgpMessage).then(function (plaintext) {
      // console.log('decrypted message', plaintext);
      return plaintext;
    });
  };

  return {
    generateKeyPair: generateKeyPair,
    encryptMessage: encryptMessage,
    decryptMessage: decryptMessage
  };

});

/*
  https://github.com/openpgpjs/openpgpjs

  angular factory
    generate private/public pgp key pair
    
    encrypt message

    decrypt message
    
*/
