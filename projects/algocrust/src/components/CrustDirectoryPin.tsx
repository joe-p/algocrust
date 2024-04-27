import { AlgorandClient, microAlgos } from '@algorandfoundation/algokit-utils'
import { useSnackbar } from 'notistack'
import { useState } from 'react'
import { StorageOrderClient } from '../contracts/StorageOrderClient'
import { directoryUploadToIPFS, getPrice, kuboApis, placeOrder } from '../utils/crust'
import FileTable from './FileTable'

interface CrustDirectoryPinInterface {
  algorand: AlgorandClient
  appClient: StorageOrderClient
  sender: string | undefined
}

const CrustDirectoryPin = ({ algorand, appClient, sender }: CrustDirectoryPinInterface) => {
  const [loading, setLoading] = useState<boolean>(false)
  const [files, setFiles] = useState<File[]>([])
  const [kuboApi, setKuboApi] = useState<string>(kuboApis[0])
  const [price, setPrice] = useState<number>(0)
  const [uploadedFiles, setUploadedFiles] = useState<{ name: string; cid: string; size: number }[]>([])
  const [root, setRoot] = useState<{ name: string; cid: string; size: number } | undefined>(undefined)

  const { enqueueSnackbar } = useSnackbar()

  const uploadFiles = async () => {
    setLoading(true)
    try {
      const uploadedFiles = await directoryUploadToIPFS(kuboApi, files)
      const rootDir = uploadedFiles.find((x) => x.name === '')
      if (rootDir === undefined) {
        throw new Error('Root directory not found')
      }

      setRoot(rootDir)
      setUploadedFiles(uploadedFiles)

      const rootPrice = await getPrice(algorand, appClient, rootDir.size, true)
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
    if (root === undefined) throw new Error('Root directory not found')
    await placeOrder(algorand, appClient, sender!, root.cid, root.size, price, true)
    setLoading(false)
  }

  return (
    <div>
      <label className="label m-2">IPFS Kubo API</label>
      <select className="select select-bordered" onChange={(e) => setKuboApi(e.currentTarget.value)}>
        {kuboApis.map((x) => (
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
      <FileTable root={root} uploadedFiles={uploadedFiles} />
    </div>
  )
}
export default CrustDirectoryPin
