/* global it,describe */
'use strict'
let Address = require('fullnode/lib/address')
let AsyncCrypto = require('../../core/async-crypto')
let BIP32 = require('fullnode/lib/bip32')
let ECDSA = require('fullnode/lib/ecdsa')
let Hash = require('fullnode/lib/hash')
let Keypair = require('fullnode/lib/keypair')
let Privkey = require('fullnode/lib/privkey')
let Pubkey = require('fullnode/lib/pubkey')
let should = require('should')
let spawn = require('../../core/spawn')
let workerpool = require('workerpool')

describe('AsyncCrypto', function () {
  let databuf = new Buffer(50)
  databuf.fill(0)
  let hashbuf = Hash.sha256(databuf)

  describe('AsyncCrypto', function () {
    it('should exist', function () {
      should.exist(AsyncCrypto)
      should.exist(AsyncCrypto.sha256)
      should.exist(AsyncCrypto.pubkeyFromPrivkey)
      should.exist(AsyncCrypto.addressFromPubkey)
      should.exist(AsyncCrypto.sign)
      let asyncCrypto = new AsyncCrypto()
      should.exist(asyncCrypto)
      should.exist(asyncCrypto.sha256)
      should.exist(asyncCrypto.pubkeyFromPrivkey)
      should.exist(asyncCrypto.addressFromPubkey)
      should.exist(asyncCrypto.sign)
    })

    it('should share the same default worker pool', function () {
      let asyncCrypto = new AsyncCrypto()
      let asyncCrypto2 = new AsyncCrypto()
      asyncCrypto2.pool.should.equal(asyncCrypto.pool)

      let pool
      if (!process.browser) {
        pool = workerpool.pool(__dirname + '/worker.js')
      } else {
        pool = workerpool.pool(process.env.DATT_JS_BASE_URL + process.env.DATT_CORE_JS_WORKER_FILE)
      }
      let asyncCrypto3 = new AsyncCrypto(pool)
      asyncCrypto3.pool.should.not.equal(asyncCrypto.pool)
      asyncCrypto3.pool.should.equal(pool)
    })
  })

  describe('@sha256', function () {
    it('should compute the same as fullnode', function () {
      return spawn(function *() {
        let buf = yield AsyncCrypto.sha256(databuf)
        buf.compare(Hash.sha256(databuf)).should.equal(0)
      })
    })
  })

  describe('@pubkeyFromPrivkey', function () {
    it('should compute the same as fullnode', function () {
      return spawn(function *() {
        let privkey = Privkey().fromRandom()
        let pubkey = yield AsyncCrypto.pubkeyFromPrivkey(privkey)
        pubkey.toString().should.equal(Pubkey().fromPrivkey(privkey).toString())
      })
    })
  })

  describe('@addressFromPubkey', function () {
    it('should compute the same as fullnode', function () {
      return spawn(function *() {
        let privkey = Privkey().fromRandom()
        let pubkey = Pubkey().fromPrivkey(privkey)
        let address = yield AsyncCrypto.addressFromPubkey(pubkey)
        address.toString().should.equal(Address().fromPubkey(pubkey).toString())
      })
    })
  })

  describe('@xkeysFromEntropy', function () {
    it('should derive new mnemonic, xprv, xpub', function () {
      return spawn(function *() {
        let seedbuf = new Buffer(128 / 8)
        seedbuf.fill(0)
        let obj = yield AsyncCrypto.xkeysFromEntropy(seedbuf)
        obj.mnemonic.should.equal('abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about')
        obj.xprv.toString().should.equal('xprv9s21ZrQH143K3GJpoapnV8SFfukcVBSfeCficPSGfubmSFDxo1kuHnLisriDvSnRRuL2Qrg5ggqHKNVpxR86QEC8w35uxmGoggxtQTPvfUu')
        obj.xpub.toString().should.equal('xpub661MyMwAqRbcFkPHucMnrGNzDwb6teAX1RbKQmqtEF8kK3Z7LZ59qafCjB9eCRLiTVG3uxBxgKvRgbubRhqSKXnGGb1aoaqLrpMBDrVxga8')
      })
    })
  })

  describe('@deriveXkeysFromXprv', function () {
    it('should derive new xprv, xpub, address', function () {
      return spawn(function *() {
        let seedbuf = new Buffer(128 / 8)
        seedbuf.fill(0)
        let xprv = BIP32().fromSeed(seedbuf)
        let path = "m/44'/0'/0'/0/0"
        let obj = yield AsyncCrypto.deriveXkeysFromXprv(xprv, path)
        obj.xprv.toString().should.equal('xprvA4EMaq49eKGKGK2k3kAsiqTowWrNuidQTx5DaYm669TjJUtsEARurRTwXiP1PXsNkxL4pLijwktqb9gSWHccdm92nKDKznNUCSKwvktQLp2')
        obj.xpub.toString().should.equal('xpub6HDhzLb3UgpcUo7D9mht5yQYVYgsKBMFqAzpNwAheUziBHE1mhkAQDnRNyTArZsiyczWpmchy1H6nEzCeLpa7Xm5BGxpbHRP2dKKUR3puTv')
        obj.address.toString().should.equal('1CwgwxqUVapWbgk6ssLruv9eHxHe6LvCe6')
      })
    })
  })

  describe('@sign', function () {
    it('should compute the same as bitcore', function () {
      return spawn(function *() {
        let privkey = Privkey().fromRandom()
        let sig = yield AsyncCrypto.sign(hashbuf, privkey, 'big')
        let keypair = Keypair().fromPrivkey(privkey)
        sig.toString().should.equal(ECDSA.sign(hashbuf, keypair, 'big').toString())
      })
    })
  })

  describe('@signCompact', function () {
    it('should compute a compact signature', function () {
      return spawn(function *() {
        let privkey = Privkey().fromRandom()
        let sig = yield AsyncCrypto.signCompact(hashbuf, privkey)
        should.exist(sig.recovery)
        should.exist(sig.compressed)
      })
    })
  })

  describe('@verifySignature', function () {
    it('should return true for a valid signature', function () {
      return spawn(function *() {
        let privkey = Privkey().fromRandom()
        let pubkey = Pubkey().fromPrivkey(privkey)
        let sig = yield AsyncCrypto.sign(hashbuf, privkey, 'big')
        let verified = yield AsyncCrypto.verifySignature(hashbuf, sig, pubkey)
        should.exist(verified)
        verified.should.eql(true)
      })
    })

    it('should return false for an invalid signature', function () {
      return spawn(function *() {
        let privkey = Privkey().fromRandom()
        let otherPrivkey = Privkey().fromRandom()
        let otherPubkey = Pubkey().fromPrivkey(otherPrivkey)
        let sig = yield AsyncCrypto.sign(hashbuf, privkey, 'big')
        let verified = yield AsyncCrypto.verifySignature(hashbuf, sig, otherPubkey)
        should.exist(verified)
        verified.should.eql(false)
      })
    })

    it('should reject the promise if any arguments are missing, null, or undefined', function () {
      return spawn(function *() {
        let privkey = Privkey().fromRandom()
        let pubkey = Pubkey().fromPrivkey(privkey)
        let sig = yield AsyncCrypto.sign(hashbuf, privkey, 'big')
        try {
          yield AsyncCrypto.verifySignature(null, sig, pubkey)
          should.not.exist(true)
        } catch (err) {
          should.exist(err)
        }
        try {
          yield AsyncCrypto.verifySignature(undefined, sig, pubkey)
          should.not.exist(true)
        } catch (err) {
          should.exist(err)
        }
        try {
          yield AsyncCrypto.verifySignature(hashbuf, null, sig)
          should.not.exist(true)
        } catch (err) {
          should.exist(err)
        }
        try {
          yield AsyncCrypto.verifySignature(hashbuf, undefined, sig)
          should.not.exist(true)
        } catch (err) {
          should.exist(err)
        }
        try {
          yield AsyncCrypto.verifySignature(hashbuf, sig, null)
          should.not.exist(true)
        } catch (err) {
          should.exist(err)
        }
        try {
          yield AsyncCrypto.verifySignature(hashbuf, sig, undefined)
          should.not.exist(true)
        } catch (err) {
          should.exist(err)
        }
      })
    })
  })

  describe('@verifyCompactSig', function () {
    it('should validate this signature', function () {
      return spawn(function *() {
        let keypair = Keypair().fromRandom()
        let sig = ECDSA.sign(hashbuf, keypair)
        sig = ECDSA.calcrecovery(sig, keypair.pubkey, hashbuf)

        let obj = yield AsyncCrypto.verifyCompactSig(hashbuf, sig)
        obj.verified.should.equal(true)
        Buffer.compare(obj.pubkey.toDER(), keypair.pubkey.toDER()).should.equal(0)
      })
    })
  })
})