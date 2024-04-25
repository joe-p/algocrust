import { AlgorandClient, microAlgos } from '@algorandfoundation/algokit-utils'
import algosdk from 'algosdk'
import { useSnackbar } from 'notistack'
import { useState } from 'react'
import { StorageOrderClient } from '../contracts/StorageOrderClient'
import { FileInfo, gateways, getPrice, getTotalPrice, placeOrdersWithLsig, uploadToIPFS } from '../utils/crust'

interface CrustMultiPinInterface {
  algorand: AlgorandClient
  appClient: StorageOrderClient
  sender: string | undefined
}

const CrustMultiPin = ({ algorand, appClient, sender }: CrustMultiPinInterface) => {
  const [loading, setLoading] = useState<boolean>(false)
  const [files, setFiles] = useState<File[]>([])
  const [gateway, setGateway] = useState<string>(gateways[0])
  const [filesInfo, setFilesInfo] = useState<FileInfo[]>([])
  const [totalPrice, setTotalPrice] = useState<number>(100_000)
  const { enqueueSnackbar } = useSnackbar()

  const uploadFiles = async () => {
    setLoading(true)
    try {
      const newFilesInfo = await Promise.all(
        files.map(async (file) => {
          const { cid, size } = await uploadToIPFS(algosdk.generateAccount(), gateway, file!)
          enqueueSnackbar(`${file.name} uploaded to IPFS with CID ${cid}`, { variant: 'info' })
          const price = await getPrice(algorand, appClient, size, false)

          return { cid, size, price }
        }),
      )

      setFilesInfo(newFilesInfo)

      setTotalPrice(getTotalPrice(newFilesInfo))
    } catch (e) {
      enqueueSnackbar(JSON.stringify(e), { variant: 'error' })
      // eslint-disable-next-line no-console
      console.warn(e)
    }

    setLoading(false)
  }

  const pinFile = async () => {
    setLoading(true)
    const logger = (msg: string) => {
      enqueueSnackbar(msg, { variant: 'info' })
      // eslint-disable-next-line no-console
      console.info(msg)
    }
    await placeOrdersWithLsig(algorand, appClient, sender!, filesInfo, false, logger)
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
      <button className="btn m-2" disabled={filesInfo.length === 0 || sender === undefined} onClick={pinFile}>
        {loading ? <span className="loading loading-spinner" /> : `Pin for ${microAlgos(totalPrice - 100_000).algos} ALGO`}
      </button>
    </div>
  )
}
export default CrustMultiPin
