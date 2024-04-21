// src/components/Home.tsx
import { AlgorandClient, Config } from '@algorandfoundation/algokit-utils'
import { useWallet } from '@txnlab/use-wallet'
import React, { useState } from 'react'
import ConnectWallet from './components/ConnectWallet'
import CrustPin from './components/CrustPin'
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
    <div className="hero min-h-screen bg-teal-400">
      <div className="hero-content text-center rounded-lg p-6 max-w-md bg-white mx-auto">
        <div className="max-w-md">
          <h1 className="text-4xl">
            Welcome to <div className="font-bold">AlgoKit 🙂</div>
          </h1>
          <p className="py-6">
            This starter has been generated using official AlgoKit React template. Refer to the resource below for next steps.
          </p>

          <div className="grid">
            <a
              data-test-id="getting-started"
              className="btn btn-primary m-2"
              target="_blank"
              href="https://github.com/algorandfoundation/algokit-cli"
            >
              Getting started
            </a>

            <div className="divider" />
            <button data-test-id="connect-wallet" className="btn m-2" onClick={toggleWalletModal}>
              Wallet Connection
            </button>
            {activeAddress && (
              <CrustPin
                sender={activeAddress!}
                cid="bafkreibrr2cpyb6azlystftvf4uba4qt5v2ihdq43xtdefactz3j7snmvy"
                algorand={algorand}
                appClient={appClient}
                size={22661}
              />
            )}
          </div>

          <ConnectWallet openModal={openWalletModal} closeModal={toggleWalletModal} />
        </div>
      </div>
    </div>
  )
}

export default Home
