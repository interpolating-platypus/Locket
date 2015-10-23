angular.module('Locket.encryptionFactory', [])

.factory('encryptionFactory', function ($window) {

  var generateOptions = function (n) {
    // var randomIdIndex = Math.floor(Math.random() * 10);
    // console.log('random id index', randomIdIndex);
    // var randomPassphraseIndex = Math.floor(Math.random() * 10);
    // console.log('random passphrase index', randomPassphraseIndex);
    var randomIdArray = new Uint32Array(n);
    var randomId = $window.crypto.getRandomValues(randomIdArray).join('');
    var randomPassphraseArray = new Uint32Array(n);
    var randomPassphrase = $window.crypto.getRandomValues(randomPassphraseArray).join('');
    console.log('random id', randomId);
    console.log('random passphrase', randomPassphrase);

    // should randomly generate
    var options = {
      numBits: 2048,
      userId: randomId,
      passphrase: randomPassphrase
    };

    return options;
  };

  var generateKeyPair = function () {
    var keyring = {};

    openpgp.generateKeyPair(generateOptions(10))
    .then(function (keypair) {
      keyring.privkey = keypair.privateKeyArmored;
      keyring.pubkey = keypair.publicKeyArmored;
    }).then(function () {
      console.log(keyring);
      return keyring;
    }).catch(function (error) {
      // failure
    });
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
    generateKeyPair: generateKeyPair
  };

});

/*
  https://github.com/openpgpjs/openpgpjs

  angular factory
    generate private/public pgp key pair
    
    encrypt message

    decrypt message
    
*/
