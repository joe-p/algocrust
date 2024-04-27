import { AlgorandClient } from '@algorandfoundation/algokit-utils'
import { base16 } from 'multiformats/bases/base16'
import { CID } from 'multiformats/cid'
import { useSnackbar } from 'notistack'
import { useState } from 'react'
import { gateways, getFileFromGateway } from '../utils/crust'
interface ARC23ViewerInterface {
  algorand: AlgorandClient
}

const ARC23Viewer = ({ algorand }: ARC23ViewerInterface) => {
  const { enqueueSnackbar } = useSnackbar()
  const [gateway, setGateway] = useState<string>(gateways[0])
  const [appId, setAppId] = useState<number>(1796294669)
  const [loading, setLoading] = useState<boolean>(false)
  const [source, setSource] = useState<string>('')

  const getSource = async () => {
    setLoading(true)
    const appInfo = await algorand.client.algod.getApplicationByID(appId).do()

    const byteCode = Buffer.from(appInfo.params['approval-program'], 'base64')

    const teal = (await algorand.client.algod.disassemble(byteCode).do()).result as string

    const match = teal.match(/(?<=6172633233)\S+/)?.[0]

    if (match === undefined) {
      enqueueSnackbar('No CID found in source', { variant: 'error' })
      return
    }

    let hex = match
    if (hex.startsWith('0')) hex = hex.slice(1)

    const cid = CID.parse(hex, base16)
    console.log(cid.toString())

    setSource(await (await getFileFromGateway(gateway, `${cid.toString()}/application.ts`)).text())

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

      <label className="label m-2">App ID</label>
      <input className="input input-bordered" type="number" value={appId} onChange={(e) => setAppId(e.currentTarget.valueAsNumber)} />
      <button className="btn" disabled={appId === 0} onClick={getSource}>
        {loading ? <span className="loading loading-spinner" /> : 'Get Source'}
      </button>
      <br />
      <br />

      <pre className="bg-base-200">{source}</pre>
    </div>
  )
}
export default ARC23Viewer
