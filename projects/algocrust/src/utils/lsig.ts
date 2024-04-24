export const LSIG_TEAL = `#pragma version 10
//#pragma mode logicsig

// This TEAL was generated by TEALScript v0.90.3
// https://github.com/algorandfoundation/TEALScript

// The address of this logic signature is YU6O2DYGIHX32S7YB2XY5YUEUHMLMB66VBSZGYCLACQRFETBW5WIHFXLLU

b *route_logic

// logic()void
*route_logic:
	// execute logic()void
	callsub logic
	int 1
	return

// logic(): void
logic:
	proto 0 0

	// Push empty bytes after the frame pointer to reserve space for local variables
	byte 0x

	// *if0_condition
	// contracts/AlgoCrustLsig.algo.ts:14
	// this.txn.lastValid > this.lastRound
	txn LastValid
	pushint TMPL_lastRound
	>
	bz *if0_end

	// *if0_consequent
	// contracts/AlgoCrustLsig.algo.ts:15
	// verifyPayTxn(this.txn, {
	//         amount: 0,
	//         closeRemainderTo: this.funder,
	//       })
	// verify pay
	txn TypeEnum
	int pay
	==
	assert

	// verify amount
	txn Amount
	int 0
	==
	assert

	// verify closeRemainderTo
	txn CloseRemainderTo
	pushbytes TMPL_funder
	==
	assert

	// contracts/AlgoCrustLsig.algo.ts:20
	// return;
	retsub

*if0_end:
	// contracts/AlgoCrustLsig.algo.ts:23
	// verifyTxn(this.txn, {
	//       rekeyTo: globals.zeroAddress,
	//       closeRemainderTo: globals.zeroAddress,
	//       lastValid: this.lastRound,
	//     })
	// verify rekeyTo
	txn RekeyTo
	global ZeroAddress
	==
	assert

	// verify closeRemainderTo
	txn CloseRemainderTo
	global ZeroAddress
	==
	assert

	// verify lastValid
	txn LastValid
	pushint TMPL_lastRound
	==
	assert

	// contracts/AlgoCrustLsig.algo.ts:29
	// assert(this.txnGroup.length === 2)
	global GroupSize
	int 2
	==
	assert

	// contracts/AlgoCrustLsig.algo.ts:31
	// cid = extract3(this.txnGroup[1].applicationArgs[2], 2, 0)
	int 1
	gtxns ApplicationArgs 2
	extract 2 0
	frame_bury 0 // cid: byte[]

	// contracts/AlgoCrustLsig.algo.ts:41
	// verifyAppCallTxn(this.txnGroup[1], {
	//       applicationID: this.crustAppId,
	//       applicationArgs: {
	//         0: method('place_order(pay,account,string,uint64,bool)void'),
	//       },
	//       lease: sha256(cid),
	//     })
	// verify appl
	int 1
	gtxns TypeEnum
	int appl
	==
	assert

	// verify applicationID
	int 1
	gtxns ApplicationID
	pushint TMPL_crustAppId
	==
	assert

	// verify applicationArgs
	// verify applicationArgs 0
	int 1
	gtxns ApplicationArgs 0
	method "place_order(pay,account,string,uint64,bool)void"
	==
	assert

	// verify lease
	int 1
	gtxns Lease
	frame_dig 0 // cid: byte[]
	sha256
	==
	assert
	retsub`
