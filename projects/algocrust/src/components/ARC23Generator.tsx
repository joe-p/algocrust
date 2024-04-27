import * as algokit from '@algorandfoundation/algokit-utils'
import { AlgorandClient, microAlgos } from '@algorandfoundation/algokit-utils'
import { base16 } from 'multiformats/bases/base16'
import { CID } from 'multiformats/cid'
import { useSnackbar } from 'notistack'
import { useState } from 'react'
import { StorageOrderClient } from '../contracts/StorageOrderClient'
import { directoryUploadToIPFS, gateways, getPrice, placeOrder } from '../utils/crust'
import FileTable from './FileTable'

interface ARC23GeneratorInterface {
  algorand: AlgorandClient
  appClient: StorageOrderClient
  sender: string | undefined
}

function renameFile(originalFile: File, newName: string) {
  return new File([originalFile], newName, {
    type: originalFile.type,
    lastModified: originalFile.lastModified,
  })
}

// https://stackoverflow.com/a/66387148
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function parseJsonFile(file: File): Promise<any> {
  return new Promise((resolve, reject) => {
    const fileReader = new FileReader()
    fileReader.onload = (event) => resolve(JSON.parse(event.target!.result as string))
    fileReader.onerror = (error) => reject(error)
    fileReader.readAsText(file)
  })
}

const ARC23Generator = ({ algorand, appClient, sender }: ARC23GeneratorInterface) => {
  const [loading, setLoading] = useState<boolean>(false)
  const [gateway, setGateway] = useState<string>(gateways[0])
  const [price, setPrice] = useState<number>(0)
  const [uploadedFiles, setUploadedFiles] = useState<{ name: string; cid: string; size: number }[]>([])
  const [root, setRoot] = useState<{ name: string; cid: string; size: number } | undefined>(undefined)
  const [approval, setApproval] = useState<File | undefined>(undefined)
  const [clear, setClear] = useState<File | undefined>(undefined)
  const [contract, setContract] = useState<File | undefined>(undefined)
  const [app, setApp] = useState<File | undefined>(undefined)
  const [arc32, setArc32] = useState<File | undefined>(undefined)
  const [arc32With23, setArc32With23] = useState<string>('')

  const { enqueueSnackbar } = useSnackbar()

  const uploadFiles = async () => {
    setLoading(true)
    try {
      if (approval === undefined) throw new Error('Must upload approval program')
      if (clear === undefined) throw new Error('Must upload clear program')
      if (contract === undefined) throw new Error('Must upload contract JSON')
      if (app === undefined) throw new Error('Must upload app source')
      if (arc32 === undefined) throw new Error('Must upload ARC32 JSON')

      const uploadedFiles = await directoryUploadToIPFS(gateway, [
        renameFile(approval, 'approval.teal'),
        renameFile(clear, 'clear.teal'),
        renameFile(contract, 'contract.json'),
        renameFile(app, `application.${app.name.split('.').pop()}`),
        renameFile(arc32, 'arc32.json'),
      ])

      const rootDir = uploadedFiles.find((x) => x.name === '')
      if (rootDir === undefined) {
        throw new Error('Root directory not found')
      }

      setRoot(rootDir)
      setUploadedFiles(uploadedFiles)

      const arc32Json = await parseJsonFile(arc32)

      let rootHex = CID.parse(rootDir.cid).toString(base16)

      if (rootHex.length % 2 === 1) {
        rootHex = `0${rootHex}`
      }

      const arc23Hex = `0x6172633233${rootHex}`

      const arc23Teal = `${atob(arc32Json.source.approval)}\nbytecblock ${arc23Hex}`

      arc32Json.source.approval = btoa(arc23Teal)

      setArc32With23(JSON.stringify(arc32Json))

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

  const deploy = async () => {
    setLoading(true)
    if (arc32With23 === '') throw new Error('ARC32 with ARC23 not found')

    const client = algokit.getAppClient({ resolveBy: 'id', id: 0, app: arc32With23 }, algorand.client.algod)

    const createApplication = client.getABIMethod('createApplication()void')

    if (createApplication === undefined) throw Error(`Deployment is only supported for contracts that implement createApplication()void`)

    const result = await client.create({
      method: 'createApplication',
      sender: { addr: sender!, signer: algorand.account.getSigner(sender!) },
      methodArgs: [],
    })

    console.log(result)

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

      <label className="label m-2">Approval Program</label>
      <input type="file" multiple className="file-input file-input-bordered m-2" onChange={(e) => setApproval(e.target.files?.[0])} />

      <label className="label m-2">Clear Program</label>
      <input type="file" multiple className="file-input file-input-bordered m-2" onChange={(e) => setClear(e.target.files?.[0])} />

      <label className="label m-2">Contract JSON</label>
      <input type="file" multiple className="file-input file-input-bordered m-2" onChange={(e) => setContract(e.target.files?.[0])} />

      <label className="label m-2">App Source</label>
      <input type="file" multiple className="file-input file-input-bordered m-2" onChange={(e) => setApp(e.target.files?.[0])} />

      <label className="label m-2">ARC32 JSON</label>
      <input type="file" multiple className="file-input file-input-bordered m-2" onChange={(e) => setArc32(e.target.files?.[0])} />

      <br />
      <button className="btn m-2" onClick={uploadFiles}>
        {loading ? <span className="loading loading-spinner" /> : `Upload file to IPFS`}
      </button>

      <button className="btn m-2" disabled={sender === undefined} onClick={pinFile}>
        {loading ? <span className="loading loading-spinner" /> : `Pin for ${microAlgos(price).algos} ALGO`}
      </button>

      <button className="btn m-2" disabled={sender === undefined} onClick={deploy}>
        {loading ? <span className="loading loading-spinner" /> : `Deploy With ARC23`}
      </button>

      <FileTable root={root} uploadedFiles={uploadedFiles} />
    </div>
  )
}
export default ARC23Generator
