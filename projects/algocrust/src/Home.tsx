// src/components/Home.tsx
import { AlgorandClient, Config } from '@algorandfoundation/algokit-utils'
import { useWallet } from '@txnlab/use-wallet'
import React, { useState } from 'react'
import ARC23Generator from './components/ARC23Generator'
import ConnectWallet from './components/ConnectWallet'
import CrustDirectoryPin from './components/CrustDirectoryPin'
import { StorageOrderClient } from './contracts/StorageOrderClient'
import { getAlgodConfigFromViteEnvironment } from './utils/network/getAlgoClientConfigs'

Config.configure({ populateAppCallResources: true })
interface HomeProps {}

const Home: React.FC<HomeProps> = () => {
  const [openWalletModal, setOpenWalletModal] = useState<boolean>(false)
  const [page, setPage] = useState<'uploadAndPin' | 'arc23Generator'>('uploadAndPin')

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

  const changePage = (newPage: 'uploadAndPin' | 'arc23Generator') => () => {
    if (newPage !== page) setPage(newPage)
  }

  return (
    <div>
      <div className="navbar bg-base-100">
        <div className="navbar-start">
          <a className="btn btn-ghost text-xl" onClick={changePage('uploadAndPin')}>
            Upload & Pin
          </a>

          <a className="btn btn-ghost text-xl" onClick={changePage('arc23Generator')}>
            ARC23 Generator
          </a>
        </div>
        <div className="navbar-end">
          <a className="btn btn-ghost text-xs" onClick={toggleWalletModal}>
            {activeAddress ? `${activeAddress.slice(0, 4)}...${activeAddress.slice(54, 58)}` : 'Connect Wallet'}
          </a>
        </div>
      </div>
      {page === 'uploadAndPin' && <CrustDirectoryPin algorand={algorand} appClient={appClient} sender={activeAddress} />}
      {page === 'arc23Generator' && <ARC23Generator algorand={algorand} appClient={appClient} sender={activeAddress} />}

      <ConnectWallet openModal={openWalletModal} closeModal={toggleWalletModal} />
    </div>
  )
}

export default Home
