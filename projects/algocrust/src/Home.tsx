// src/components/Home.tsx
import { AlgorandClient, Config } from '@algorandfoundation/algokit-utils'
import { useWallet } from '@txnlab/use-wallet'
import React, { useState } from 'react'
import ConnectWallet from './components/ConnectWallet'
import CrustDirectoryPin from './components/CrustDirectoryPin'
import FileTable from './components/FileTable'
import { StorageOrderClient } from './contracts/StorageOrderClient'
import { getAlgodConfigFromViteEnvironment } from './utils/network/getAlgoClientConfigs'

Config.configure({ populateAppCallResources: true })
interface HomeProps {}

const Home: React.FC<HomeProps> = () => {
  const [openWalletModal, setOpenWalletModal] = useState<boolean>(false)
  const [uploadedFiles, setUploadedFiles] = useState<{ name: string; cid: string; size: number }[]>([])
  const [root, setRoot] = useState<{ name: string; cid: string; size: number } | undefined>(undefined)

  const { activeAddress, signer } = useWallet()

  const algodConfig = getAlgodConfigFromViteEnvironment()
  const algorand = AlgorandClient.fromConfig({ algodConfig })
  algorand.setDefaultSigner(signer)

  const appClient = new StorageOrderClient(
    {
      sender: { addr: activeAddress!, signer },
      resolveBy: 'id',
      // id: network === 'testnet' ? 507867511 : 1275319623,
      id: 1275319623,
    },
    algorand.client.algod,
  )

  const toggleWalletModal = () => {
    setOpenWalletModal(!openWalletModal)
  }

  return (
    <div>
      <div className="navbar bg-base-100">
        <div className="navbar-start">
          <a className="btn btn-ghost text-xl">Upload & Pin</a>
        </div>
        <div className="navbar-end">
          <a className="btn btn-ghost text-xs" onClick={toggleWalletModal}>
            {activeAddress ? `${activeAddress.slice(0, 4)}...${activeAddress.slice(54, 58)}` : 'Connect Wallet'}
          </a>
        </div>
      </div>
      <CrustDirectoryPin
        algorand={algorand}
        appClient={appClient}
        sender={activeAddress}
        root={root}
        setRoot={setRoot}
        setUploadedFiles={setUploadedFiles}
      />
      <FileTable root={root} uploadedFiles={uploadedFiles} />

      <ConnectWallet openModal={openWalletModal} closeModal={toggleWalletModal} />
    </div>
  )
}

export default Home
