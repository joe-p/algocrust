import { AlgorandClient, microAlgos } from '@algorandfoundation/algokit-utils'
import { useSnackbar } from 'notistack'
import { useState } from 'react'
import { StorageOrderClient } from '../contracts/StorageOrderClient'
import { directoryUploadToIPFS, gateways, getPrice, placeOrder } from '../utils/crust'

interface CrustDirectoryPinInterface {
  algorand: AlgorandClient
  appClient: StorageOrderClient
  sender: string | undefined
}

const CrustDirectoryPin = ({ algorand, appClient, sender }: CrustDirectoryPinInterface) => {
  const [loading, setLoading] = useState<boolean>(false)
  const [files, setFiles] = useState<File[]>([])
  const [gateway, setGateway] = useState<string>(gateways[0])
  const [price, setPrice] = useState<number>(0)
  const [cid, setCid] = useState<string>('')
  const [size, setSize] = useState<number>(0)
  const { enqueueSnackbar } = useSnackbar()

  const uploadFiles = async () => {
    setLoading(true)
    try {
      const uploadedFiles = await directoryUploadToIPFS(gateway, files)
      const root = uploadedFiles.find((x) => x.name === '')
      if (root === undefined) {
        throw new Error('Root directory not found')
      }

      setCid(root.cid)
      setSize(root.size)

      const rootPrice = await getPrice(algorand, appClient, root.size, true)
      setPrice(rootPrice)
    } catch (e) {
      enqueueSnackbar(JSON.stringify(e), { variant: 'error' })
      // eslint-disable-next-line no-console
      console.warn(e)
    }

    setLoading(false)
  }

  const pinFile = async () => {
    setLoading(true)
    await placeOrder(algorand, appClient, sender!, cid, size, price, true)
    setLoading(false)
  }

  return (
    <div>
      <label className="label m-2">IPFS Gateway</label>
      <select className="select select-bordered" onChange={(e) => setGateway(e.currentTarget.value)}>
        {gateways.map((x) => (
          <option key={x}>{x}</option>
        ))}
      </select>
      <input
        type="file"
        multiple
        className="file-input file-input-bordered m-2"
        onChange={(e) => setFiles(new Array(...(e.currentTarget.files || [])))}
      />
      <button className="btn m-2" onClick={uploadFiles}>
        {loading ? <span className="loading loading-spinner" /> : `Upload file to IPFS`}
      </button>
      <button className="btn m-2" disabled={sender === undefined} onClick={pinFile}>
        {loading ? <span className="loading loading-spinner" /> : `Pin for ${microAlgos(price).algos} ALGO`}
      </button>
    </div>
  )
}
export default CrustDirectoryPin
