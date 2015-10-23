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
  
  var generateKeyPair = function () {
    var keyring = {};
    
    return openpgp.generateKeyPair(generateOptions(10))
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
      console.log('encrypted message', pgpMessage);
      return pgpMessage;
    });
  };

  var decryptMessage = function (pgpMessage, keyring) {
    var privKey = keyring.privkey;
    var privateKey = openpgp.key.readArmored(privKey).keys[0];
  };

  // var keyring = {};
  // var publicKey;
  // var privateKey;
  // openpgp.generateKeyPair(options)
  // .then(function(keypair) {
  //   // success
  //   // var privkey = keypair.privateKeyArmored;
  //   // var pubkey = keypair.publicKeyArmored;
  //   keyring.privkey = keypair.privateKeyArmored;
  //   keyring.pubkey = keypair.publicKeyArmored;
  //   console.log('keys', keyring);
  // }).then(function() {
  //   var pubKey = keyring.pubkey;
  //   publicKey = openpgp.key.readArmored(pubKey);
  // }).then(function() {
  //   openpgp.encryptMessage(publicKey.keys, 'Hello, World!')
  //   .then(function(pgpMessage) {
  //     // success
  //     console.log('encrypted message', pgpMessage);
      
  //     var privKey = keyring.privkey;
  //     privateKey = openpgp.key.readArmored(privKey).keys[0];
  //     privateKey.decrypt(options.passphrase);
  //     pgpMessage = openpgp.message.readArmored(pgpMessage);

  //     openpgp.decryptMessage(privateKey, pgpMessage).then(function(plaintext) {
  //       // success
  //       console.log('decrypted message', plaintext);
  //     }).catch(function(error) {
  //       // failure
  //     });
  //   }).catch(function(error) {
  //     // failure
  //   });
  // }).catch(function(error) {
  //   // failure
  // });

  return {
    generateKeyPair: generateKeyPair,
    encryptMessage: encryptMessage
  };

});

/*
  https://github.com/openpgpjs/openpgpjs

  angular factory
    generate private/public pgp key pair
    
    encrypt message

    decrypt message
    
*/
