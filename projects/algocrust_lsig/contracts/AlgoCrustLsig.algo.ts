import { LogicSig } from '@algorandfoundation/tealscript';

export class AlgoCrustLsig extends LogicSig {
  lastRound = TemplateVar<uint64>();

  funder = TemplateVar<Address>();

  crustAppId = TemplateVar<AppID>();

  signer = TemplateVar<Address>();

  // TODO: Add merkle root for CID verification

  logic(sig: bytes64): void {
    // The only thing this lsig can do after the last round has past is close to the funder
    // @ts-expect-error TODO: expose lastValid
    if (this.txn.lastValid > this.lastRound) {
      verifyPayTxn(this.txn, {
        amount: 0,
        closeRemainderTo: this.funder,
      });

      return;
    }

    // If we are closing early, verify the signer has signed the txid
    if (this.txn.closeRemainderTo === this.funder) {
      verifyPayTxn(this.txn, {
        amount: 0,
      });

      ed25519Verify(this.txn.txID, sig, this.signer);

      return;
    }

    verifyTxn(this.txn, {
      rekeyTo: globals.zeroAddress,
      closeRemainderTo: globals.zeroAddress,
      lastValid: this.lastRound,
    });

    assert(this.txnGroup.length === 2);

    const cid = extract3(this.txnGroup[1].applicationArgs[2], 2, 0);

    ed25519Verify(cid, sig, this.signer);

    /*
    def place_order(
        seed: pt.abi.PaymentTransaction,
        merchant: pt.abi.Account,
        cid: pt.abi.String,
        size: pt.abi.Uint64,
        is_permanent: pt.abi.Bool
    */
    verifyAppCallTxn(this.txnGroup[1], {
      applicationID: this.crustAppId,
      applicationArgs: {
        0: method('place_order(pay,account,string,uint64,bool)void'),
      },
      lease: sha256(cid),
    });
  }
}
