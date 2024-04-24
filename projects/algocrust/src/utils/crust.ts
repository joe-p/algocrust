import * as algokit from '@algorandfoundation/algokit-utils'
import algosdk from 'algosdk'
import axios from 'axios'
import { ethers } from 'ethers'
import { sha256 } from 'js-sha256'
import nacl from 'tweetnacl'
import { StorageOrderClient } from '../contracts/StorageOrderClient'
import { LSIG_TEAL } from './lsig'

export type FileInfo = { cid: string; size: number; price: number }

export const gateways = [
  'https://gw.crustfiles.net',
  'https://crustgateway.com',
  'https://crustipfs.xyz',
  'https://ipfs-gw.decloud.foundation',
  'https://gw.w3ipfs.cn:10443',
  'https://gw.smallwolf.me',
  'https://gw.w3ipfs.com:7443',
  'https://gw.w3ipfs.net:7443',
  'https://crust.fans',
  'https://crustgateway.online',
  'https://gw.w3ipfs.org.cn',
  'https://223.111.148.195',
  'https://223.111.148.196',
]

const SIM_REQ = new algosdk.modelsv2.SimulateRequest({ allowEmptySignatures: true, txnGroups: [] })
const FEE_SINK_SENDER = { addr: 'Y76M3MSY6DKBRHBL7C3NNDXGS5IIMQVQVUAB6MP4XEMMGVF2QWNPL226CA', signer: algosdk.makeEmptyTransactionSigner() }

/**
 * Generate a web3 auth header from an Algorand account
 */
function getAuthHeader(account: algosdk.Account) {
  const sk32 = account.sk.slice(0, 32)
  const signingKey = nacl.sign.keyPair.fromSeed(sk32)

  const signature = nacl.sign(Buffer.from(account.addr), signingKey.secretKey)
  const sigHex = Buffer.from(signature).toString('hex').slice(0, 128)
  const authStr = `sub-${account.addr}:0x${sigHex}`

  return Buffer.from(authStr).toString('base64')
}

/**
 * upload a file to IPFS and get its CID and size
 *
 * @param account Account to use to generate the auth header
 */
export async function uploadToIPFS(account: algosdk.Account, gateway: string, file: File) {
  // list of API hosts
  // https://github.com/crustio/crust-apps/blob/master/packages/apps-config/src/ipfs-gateway-endpoints/index.ts
  const apiEndpoint = `${gateway}/api/v0/add`

  const pair = ethers.Wallet.createRandom()
  const sig = await pair.signMessage(pair.address)
  const authHeaderRaw = `eth-${pair.address}:${sig}`
  const authHeader = Buffer.from(authHeaderRaw).toString('base64')

  console.log(`Uploading file to IPFS via ${apiEndpoint}`)

  const formData = new FormData()
  formData.append(file.name, file)

  const res = await axios.post(apiEndpoint, formData, {
    params: {
      'cid-version': 1,
    },
    headers: {
      Authorization: `Basic ${authHeader}`,
      'Content-Type': 'multipart/form-data',
    },
  })

  const json: { Hash: string; Size: number } = await res.data

  console.log(`File uploaded: ${JSON.stringify(json)}`)

  return { cid: json.Hash, size: Number(json.Size) }
}

/**
 * Gets the required price to store a file of a given size
 *
 * @param algorand AlgorandClient used to simulate the ABI method call
 * @param appClient App client to use to compose the ABI method call
 * @param size Size of the file
 * @param isPermanent Whether the file should be added to the renewal pool
 * @returns Price, in uALGO, to store the file
 */
export async function getPrice(
  algorand: algokit.AlgorandClient,
  appClient: StorageOrderClient,
  size: number,
  isPermanent: boolean = false,
) {
  const result = await (
    await appClient.compose().getPrice({ size, is_permanent: isPermanent }, { sender: FEE_SINK_SENDER }).atc()
  ).simulate(algorand.client.algod, SIM_REQ)

  return Number(result.methodResults[0].returnValue?.valueOf())
}

/**
 * Uses simulate to get a random order node from the storage contract
 *
 * @param algod Algod client to use to simulate the ABI method call
 * @param appClient The app client to use to compose the ABI method call
 * @returns Address of the order node
 */
async function getOrderNode(algod: algosdk.Algodv2, appClient: StorageOrderClient) {
  return (
    await (
      await appClient
        .compose()
        .getRandomOrderNode({}, { boxes: [new Uint8Array(Buffer.from('nodes'))], sender: FEE_SINK_SENDER })
        .atc()
    ).simulate(algod, SIM_REQ)
  ).methodResults[0].returnValue?.valueOf() as string
}

/**
 * Places a storage order for a CID
 *
 * @param algod Algod client used to get transaction params
 * @param appClient App client used to call the storage app
 * @param account Account used to send the transactions
 * @param cid CID of the file
 * @param size Size of the file
 * @param price Price, in uALGO, to store the file
 * @param isPermanent Whether the file should be added to the renewal pool
 */
export async function placeOrder(
  algorand: algokit.AlgorandClient,
  appClient: StorageOrderClient,
  sender: string,
  cid: string,
  size: number,
  price: number,
  isPermanent: boolean,
) {
  const merchant = await getOrderNode(algorand.client.algod, appClient)
  const seed = await algorand.transactions.payment({
    sender,
    receiver: (await appClient.appClient.getAppReference()).appAddress,
    amount: algokit.microAlgos(price),
  })

  return await appClient.placeOrder({ seed, cid, size, is_permanent: isPermanent, merchant })
}

async function getLsigAccount(
  algod: algosdk.Algodv2,
  templatedTeal: string,
  lastRound: bigint,
  funder: string,
  crustAppId: bigint,
  signer: string,
) {
  // Replace the template variable in the lsig TEAL
  const teal = templatedTeal
    .replace(/TMPL_lastRound/g, lastRound.toString())
    .replace(/TMPL_funder/g, `0x${Buffer.from(algosdk.decodeAddress(funder).publicKey).toString('hex')}`)
    .replace(/TMPL_crustAppId/g, crustAppId.toString())
    .replace(/TMPL_signer/g, `0x${Buffer.from(algosdk.decodeAddress(signer).publicKey).toString('hex')}`)

  // Compile the TEAL
  const result = await algod.compile(Buffer.from(teal)).do()
  const b64program = result.result

  // Generate a LogicSigAccount object from the compiled program
  return new algosdk.LogicSigAccount(new Uint8Array(Buffer.from(b64program, 'base64')))
}

export function getTotalPrice(files: FileInfo[]) {
  return files.reduce((totalPrice, { price }) => totalPrice + price, 0) + 100_000 + 2_000 * files.length
}

/**
 * Places storage orders for a list of files
 *
 * @param algod Algod client used to get transaction params
 * @param appClient App client used to call the storage app
 * @param sender Account used to fund the lsig
 * @param files List of files to place orders for
 * @param isPermanent Whether the file should be added to the renewal pool
 */
export async function placeOrdersWithLsig(
  algorand: algokit.AlgorandClient,
  appClient: StorageOrderClient,
  sender: string,
  files: FileInfo[],
  isPermanent: boolean,
  logger: (msg: string) => void = console.log,
) {
  const merchant = await getOrderNode(algorand.client.algod, appClient)

  const { lastRound } = await algorand.getSuggestedParams()

  const signerAccount = algorand.account.random()

  const lsig = await getLsigAccount(
    algorand.client.algod,
    LSIG_TEAL,
    BigInt(lastRound),
    sender,
    BigInt((await appClient.appClient.getAppReference()).appId),
    signerAccount.addr,
  )

  await algorand.send.payment({
    sender,
    receiver: lsig.address(),
    amount: algokit.microAlgos(getTotalPrice(files)),
  })

  await Promise.all(
    files.map(async ({ cid, size, price }) => {
      const lease = new Uint8Array(Buffer.from(sha256(cid), 'hex'))

      logger(`Placing order for CID ${cid} with price ${price} microALGOs`)
      lsig.lsig.args = [algosdk.tealSign(signerAccount.account.sk, new Uint8Array(Buffer.from(cid)), lsig.address())]

      const signer = algosdk.makeLogicSigAccountTransactionSigner(lsig)

      const seed = {
        txn: await algorand.transactions.payment({
          sender: lsig.address(),
          receiver: (await appClient.appClient.getAppReference()).appAddress,
          amount: algokit.microAlgos(price),
          lastValidRound: BigInt(lastRound),
        }),
        signer,
      }

      const atc = await appClient
        .compose()
        .placeOrder(
          {
            // @ts-expect-error Not sure why algokit complains here... it works
            seed,
            cid,
            size,
            is_permanent: isPermanent,
            merchant,
          },
          { sender: lsig, lease },
        )
        .atc()

      atc.buildGroup()[1].txn.lastRound = lastRound

      const result = await algorand.newGroup().addAtc(atc).execute()

      logger(`Order placed for CID ${cid} with price ${price} microALGOs ${result.txIds[1]}`)
    }),
  )

  const lsigBalance = (await algorand.account.getInformation(lsig.address())).amount

  const refundTxn = await algorand.transactions.payment({
    sender: lsig.address(),
    receiver: sender,
    amount: algokit.microAlgos(0),
    closeRemainderTo: sender,
  })

  lsig.lsig.args = [algosdk.tealSign(signerAccount.account.sk, refundTxn.rawTxID(), lsig.address())]
  const signer = algosdk.makeLogicSigAccountTransactionSigner(lsig)

  const atc = new algosdk.AtomicTransactionComposer()

  atc.addTransaction({ txn: refundTxn, signer })

  const result = await algorand.newGroup().addAtc(atc).execute()

  logger(`Refund transaction ${result.txIds[0]} for ${lsigBalance} microALGOs confirmed`)
}

// async function main(network: 'testnet' | 'mainnet') {
//   const algod = algokit.getAlgoClient(algokit.getAlgoNodeConfig(network, 'algod'))
//   const account = await getAccount(algod)
//   const appClient = new StorageOrderClient(
//     {
//       sender: account,
//       resolveBy: 'id',
//       id: network === 'testnet' ? 507867511 : 1275319623,
//     },
//     algod,
//   )

//   const { size, cid } = await uploadToIPFS(account)
//   const price = await getPrice(algod, appClient, size)
//   await placeOrder(algod, appClient, account, cid, size, price, false)
// }
