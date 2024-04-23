import * as algokit from '@algorandfoundation/algokit-utils'
import algosdk from 'algosdk'
import axios from 'axios'
import { ethers } from 'ethers'
import nacl from 'tweetnacl'
import { StorageOrderClient } from '../contracts/StorageOrderClient'

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
