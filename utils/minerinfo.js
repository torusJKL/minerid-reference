const bsv = require('bsv')
const fm = require('./filemanager')

const PROTOCOL_NAME = '601dface'
const PROTOCOL_ID_VERSION = '00'

// placeholderCB1 is the zeroed out initial part of the coinbase shown in the blockbind BRFC
// see: https://github.com/bitcoin-sv-specs/brfc-minerid/tree/master/extensions/blockbind
//
// version:       01000000
// input count:   01
// previous hash: 0000000000000000000000000000000000000000000000000000000000000000
// index:         ffffffff
// script length: 08
// scriptSig:     0000000000000000
const placeholderCB1 = '01000000010000000000000000000000000000000000000000000000000000000000000000ffffffff080000000000000000'

/**
 * Calculates a Merkle root.
 *
 * It uses a modified miner-info coinbase tx to create a modified merkle root.
 *
 * @param coinbaseTxId (hex string) Coinbase transaction id.
 * @param merkleProof (list of hex strings) Merkle branches from the mining candidate.
 * @returns (hex string) Modified Merkle root.
 */
function buildMerkleRootFromCoinbase (coinbaseTxId, merkleBranches) {
  let res = Buffer.from(coinbaseTxId, 'hex').reverse() // swap endianness before concatenating

  merkleBranches.forEach(merkleBranch => {
    merkleBranch = Buffer.from(merkleBranch, 'hex').reverse() // swap endianness before concatenating
    const concat = Buffer.concat([res, merkleBranch])
    res = bsv.crypto.Hash.sha256sha256(concat)
  })
  return Buffer.from(res, 'hex').reverse().toString('hex') // swap endianness at the end
}

/**
 * Creates a coinbase output script with:
 * (1) protocol name
 * (2) protocol id version
 * (3) minerInfoTxId
 *
 * @param minerInfoTxId (hex string) An existing miner-info transaction id.
 * @returns (bsv.Script) Script containing (1) - (3) data.
 */
function createCoinbaseOpReturnScript (minerInfoTxId) {
  return bsv.Script.buildSafeDataOut([PROTOCOL_NAME, PROTOCOL_ID_VERSION, minerInfoTxId], 'hex')
}

/**
 * Creates a coinbase output script with:
 * (1) protocol name
 * (2) protocol id version
 * (3) minerInfoTxId
 * (4) blockBind
 * (5) blockBindSig
 *
 * @param minerInfoTxId (hex string) An existing miner-info transaction id.
 * @param blockBind (hex string) A block binding result.
 * @param blockBindSig (hex string) Signature over the blockBind data.
 * @returns (bsv.Script) Script containing (1) - (5) data.
 */
function createCoinbaseOpReturnScript2 (minerInfoTxId, blockBind, blockBindSig) {
  return bsv.Script.buildSafeDataOut([PROTOCOL_NAME, PROTOCOL_ID_VERSION, minerInfoTxId, blockBind, blockBindSig], 'hex')
}

/**
 * Creates a miner-info output script with:
 * (1) protocol name
 * (2) protocol id version
 * (3) miner-info document
 * (4) miner-info document signature
 *
 * @param doc (string) A miner-info document
 * @param sig (hex-string) Signature of the miner-info document
 * @returns (bsv.Script) Script containing (1) - (4) data.
 */
function createMinerInfoOpReturnScript (doc, sig) {
  doc = Buffer.from(doc).toString('hex')
  return bsv.Script.buildSafeDataOut([PROTOCOL_NAME, PROTOCOL_ID_VERSION, doc, sig], 'hex')
}

/**
 * Make a coinbase tx from cb1 & cb2 parts.
 */
function makeCoinbaseTx(cb1, cb2) {
  if (!Buffer.isBuffer(cb2)) {
    cb2 = Buffer.from(cb2, 'hex')
  }
  const cb = Buffer.concat([Buffer.from(cb1, 'hex'), cb2])
  return new bsv.Transaction(cb)
}

/**
 * Creates a miner-info coinbase tx.
 */
function createMinerInfoCoinbaseTx(ctx, minerInfoTxId) {
  ctx.addOutput(new bsv.Transaction.Output({
    script: createCoinbaseOpReturnScript(minerInfoTxId),
    satoshis: 0
  }))
  return ctx
}

/**
 * Creates a miner-info coinbase tx with the block binding support.
 */
function createMinerInfoCoinbaseTxWithBlockBind(ctx, minerInfoTxId, blockBind, blockBindSig) {
  ctx.addOutput(new bsv.Transaction.Output({
    script: createCoinbaseOpReturnScript2(minerInfoTxId, blockBind, blockBindSig),
    satoshis: 0
  }))
  return ctx
}

module.exports = {
  placeholderCB1,
  buildMerkleRootFromCoinbase,
  createCoinbaseOpReturnScript,
  createMinerInfoOpReturnScript,
  makeCoinbaseTx,
  createMinerInfoCoinbaseTx,
  createMinerInfoCoinbaseTxWithBlockBind
}
