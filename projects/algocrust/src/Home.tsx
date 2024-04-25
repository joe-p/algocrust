// src/components/Home.tsx
import { AlgorandClient, Config } from '@algorandfoundation/algokit-utils'
import { useWallet } from '@txnlab/use-wallet'
import React, { useState } from 'react'
import ConnectWallet from './components/ConnectWallet'
import CrustDirectoryPin from './components/CrustDirectoryPin'
import { StorageOrderClient } from './contracts/StorageOrderClient'
import { getAlgodConfigFromViteEnvironment } from './utils/network/getAlgoClientConfigs'

Config.configure({ populateAppCallResources: true })
interface HomeProps {}

const Home: React.FC<HomeProps> = () => {
  const [openWalletModal, setOpenWalletModal] = useState<boolean>(false)

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
          <a className="btn btn-ghost text-xl">daisyUI</a>
        </div>
        <div className="navbar-end">
          <a className="btn btn-ghost text-xs" onClick={toggleWalletModal}>
            {activeAddress ? `${activeAddress.slice(0, 4)}...${activeAddress.slice(54, 58)}` : 'Connect Wallet'}
          </a>
        </div>
      </div>
      <div className="hero min-h-screen bg-teal-400">
        <div className="hero-content text-center rounded-lg p-6 max-w-md bg-white mx-auto">
          <div className="max-w-md">
            <div className="grid">
              <CrustDirectoryPin algorand={algorand} appClient={appClient} sender={activeAddress} />
            </div>

            <ConnectWallet openModal={openWalletModal} closeModal={toggleWalletModal} />
          </div>
        </div>
      </div>
    </div>
  )
}

export default Home
