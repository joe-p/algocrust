import { AlgorandClient, microAlgos } from '@algorandfoundation/algokit-utils'
import { useState } from 'react'
import { StorageOrderClient } from '../contracts/StorageOrderClient'
import { getPrice, placeOrder } from '../utils/crust'

interface CrustPinInterface {
  cid: string
  algorand: AlgorandClient
  appClient: StorageOrderClient
  size: number
  sender: string | undefined
}

const CrustPin = ({ cid, algorand, appClient, size, sender }: CrustPinInterface) => {
  const [price, setPrice] = useState<number>(0)
  const [loading, setLoading] = useState<boolean>(false)

  // https://wiki.crust.network/docs/en/buildFileStoringDemo#5-query-order-status
  // const crustChainEndpoint = 'wss://rpc.crust.network'
  // const api = new ApiPromise({
  //   provider: new WsProvider(crustChainEndpoint),
  //   typesBundle: typesBundleForPolkadot,
  // })

  // const queryOrderStatus = async () => {
  //   await api.isReadyOrError
  //   const query = await api.query.market.filesV2(cid)
  //   console.log(query.toHuman())
  // }

  // queryOrderStatus()

  getPrice(algorand, appClient, size, true)
    .then((price) => {
      setPrice(price)
    })
    .catch((e) => {
      throw e
    })

  const pinFile = async () => {
    setLoading(true)
    const result = await placeOrder(algorand, appClient, sender!, cid, size, price, true)
    console.log(`Order placed ${result.transaction.txID()}`)
    setLoading(false)
  }

  return (
    <button className="btn m-2" disabled={price === 0 || sender === undefined} onClick={pinFile}>
      {loading ? <span className="loading loading-spinner" /> : `Pin for ${microAlgos(price).algos} ALGO`}
    </button>
  )
}
export default CrustPin
