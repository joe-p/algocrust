import algosdk from 'algosdk'
import { useState } from 'react'
import { uploadToIPFS } from '../utils/crust'

interface GatewayUploadInterface {
  setCid: (cid: string) => void
  setSize: (size: number) => void
}

// from https://github.com/crustio/crust-apps/blob/master/packages/apps-config/src/ipfs-gateway-endpoints/index.ts
const gateways = [
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

const GatewayUpload = ({ setCid, setSize }: GatewayUploadInterface) => {
  const [loading, setLoading] = useState<boolean>(false)
  const [file, setFile] = useState<File | undefined>(undefined)
  const [gateway, setGateway] = useState<string>(gateways[0])

  const uploadFile = async () => {
    setLoading(true)
    const { cid, size } = await uploadToIPFS(algosdk.generateAccount(), gateway, file!)
    setCid(cid)
    setSize(size)
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
      <input type="file" className="file-input file-input-bordered m-2" onChange={(e) => setFile(e.currentTarget.files?.[0])} />
      <button className="btn m-2" onClick={uploadFile}>
        {loading ? <span className="loading loading-spinner" /> : `Upload file to IPFS`}
      </button>
    </div>
  )
}
export default GatewayUpload
