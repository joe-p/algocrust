import { AlgorandClient } from '@algorandfoundation/algokit-utils'
import { typesBundleForPolkadot } from '@crustio/type-definitions'
import { ApiPromise, WsProvider } from '@polkadot/api'
import { StorageOrderClient } from '../contracts/StorageOrderClient'
import { getPrice, placeOrder } from '../utils/crust'

interface CrustPinInterface {
  cid: string
  algorand: AlgorandClient
  appClient: StorageOrderClient
  size: number
  sender: string
}

const CrustPin = ({ cid, algorand, appClient, size, sender }: CrustPinInterface) => {
  // https://wiki.crust.network/docs/en/buildFileStoringDemo#5-query-order-status
  const crustChainEndpoint = 'wss://rpc.crust.network'
  const api = new ApiPromise({
    provider: new WsProvider(crustChainEndpoint),
    typesBundle: typesBundleForPolkadot,
  })

  const queryOrderStatus = async () => {
    await api.isReadyOrError
    const query = await api.query.market.filesV2(cid)
    console.log(query.toHuman())
  }

  queryOrderStatus()

  const pinFile = async () => {
    console.log('Pinning file:', cid)
    const price = await getPrice(algorand, appClient, size, false)
    console.log('Price:', price)
    await placeOrder(algorand, appClient, sender, cid, size, price, false)
    console.log('Order placed')
  }

  return (
    <div>
      <button onClick={pinFile}>Pin {cid}</button>
    </div>
  )
}
export default CrustPin
