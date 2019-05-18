import utils from '@aztec/dev-utils';
import moment from 'moment';

const aztec = require('aztec.js');
const dotenv = require('dotenv');
const secp256k1 = require('@aztec/secp256k1');


dotenv.config();
const employee = secp256k1.accountFromPrivateKey(process.env.GANACHE_TESTING_ACCOUNT_2);

const defaultSalaryData = {
  notionalNote: undefined,
  viewingKey: '0x0368bac945f9aab61b51539fc295f0319b47cd89fb850dfb59a5676acad586d0c9',
  totalSalary: 10000,
  totalDuration: 10000,
  settlementCurrencyId: 0,
};


const salaryData = defaultSalaryData;
const employer = secp256k1.accountFromPrivateKey(process.env.GANACHE_TESTING_ACCOUNT_1);

const signNote = (validatorAddress, noteHash, spender, privateKey) => {
  const domain = aztec.signer.generateZKAssetDomainParams(validatorAddress);
  const schema = utils.constants.eip712.NOTE_SIGNATURE;
  const status = true;
  const message = {
    noteHash,
    spender,
    status,
  };
  const { signature } = aztec.signer.signTypedData(domain, schema, message, privateKey);
  return signature[0] + signature[1].slice(2) + signature[2].slice(2);
};


const computeRemainderNoteValue = (value, za, zb) => {
  const expectedNoteValue = Math.floor(value * (za / zb));
  const remainder = value * za - expectedNoteValue * zb;

  return {
    remainder,
    expectedNoteValue,
  };
};

// https://stackoverflow.com/questions/23575218/convert-decimal-number-to-fraction-in-javascript-or-closest-fraction


function getFraction(value, maxdenom) {
  const best = { numerator: 1, denominator: 1, err: Math.abs(value - 1) };
  if (!maxdenom) maxdenom = 10000;
  for (let denominator = 1; best.err > 0 && denominator <= maxdenom; denominator++) {
    const numerator = Math.round(value * denominator);
    const err = Math.abs(value - numerator / denominator);
    if (err >= best.err) continue;
    best.numerator = numerator;
    best.denominator = denominator;
    best.err = err;
  }
  return best;
}


export default ({
  aceContract,
  zkerc20Contract,
  settlementToken,
  joinSplitContract,
  salaryDappContract,
  accounts,
}) => {
  const mintSettlementNote = async (value, account) => {
    const settlementNote = await aztec.note.create(account.publicKey, value);
    const salaryId = await salaryDappContract.salaries(0);
    await settlementToken.giveAddressDevBalance(account.address, value, {
      from: account.address,
    });
    await settlementToken.approve(aceContract.address, value, {
      from: account.address,
    });

    const { proofData, expectedOutput, signatures } = aztec.proof.joinSplit.encodeJoinSplitTransaction({
      inputNotes: [],
      outputNotes: [settlementNote],
      senderAddress: account.address,
      inputNoteOwners: [],
      publicOwner: account.address,
      kPublic: -value,
      validatorAddress: joinSplitContract.address,
    });

    const proofOutput = aztec.abiEncoder.outputCoder.getProofOutput(expectedOutput, 0);
    const hashProof = aztec.abiEncoder.outputCoder.hashProofOutput(proofOutput);

    await aceContract.publicApprove(zkerc20Contract.address, hashProof, value, {
      from: account.address,
    });

    // await aceContract.publicApprove(salaryId, hashProof, value, {
    //   from: account.address,
    // });

    await zkerc20Contract.confidentialTransfer(proofData, signatures, {
      from: account.address,
    });

    return settlementNote;
  };

  return {
    settleSalary: async () => {
      const settlementNote = await mintSettlementNote(defaultSalaryData.totalSalary, employee);
      const {
        noteHash: signatureNoteHash,
      } = settlementNote.exportNote();

      const salaryId = await salaryDappContract.salaries(0);
      const takerBid = defaultSalaryData.notionalNote; // the current salary note
      const takerAsk = await aztec.note.create(employer.publicKey, defaultSalaryData.totalSalary, salaryId);
      defaultSalaryData.currentSalaryBalance = takerAsk;
      const makerBid = settlementNote;
      const makerAsk = settlementNote;


      const settlementSignature = signNote(zkerc20Contract.address, signatureNoteHash, salaryId, employee.privateKey);

      await zkerc20Contract.confidentialApprove(signatureNoteHash, salaryId, true, settlementSignature, {
        from: employee.address,
      });

      const { noteHash: currentBalanceHash } = defaultSalaryData.currentSalaryBalance.exportNote();

      const {
        proofData: bilateralSwapProofData,
      } = aztec.proof.bilateralSwap.encodeBilateralSwapTransaction({
        inputNotes: [takerBid, takerAsk],
        outputNotes: [makerAsk, makerBid],
        senderAddress: salaryId,
      });

      // defaultSalaryData.notionalNote = settlementNote;

      await salaryDappContract.settleInitialBalance(
        salaryId,
        bilateralSwapProofData,
        currentBalanceHash,
        {
          from: employee.address,
        },
      );
    },
    createSalary: async () => {
      const salaryNote = await aztec.note.create(employer.publicKey, defaultSalaryData.totalSalary);
      const newTotalNote = await aztec.note.create(employer.publicKey, defaultSalaryData.totalSalary);
      const oldTotalNote = await aztec.note.createZeroValueNote();
      const {
        noteHash: salaryNoteHash,
        publicKey: salaryPublicKey,
      } = salaryNote.exportNote();

      defaultSalaryData.notionalNote = salaryNote;
      const {
        proofData,
      } = aztec.proof.mint.encodeMintTransaction({
        newTotalMinted: newTotalNote,
        oldTotalMinted: oldTotalNote,
        adjustedNotes: [salaryNote],
        senderAddress: salaryDappContract.address,
      });
      const salary = await salaryDappContract.createSalary(
        salaryNoteHash,
        salaryData.viewingKey,
        employer.publicKey,
        salaryData.totalSalary,
        salaryData.totalDuration,
        salaryData.settlementCurrencyId,
        proofData,
        // salariesignature,
        {
          from: accounts[1],
        },
      );
      const salaryId = await salaryDappContract.salaries(0);
      const salariesignature = signNote(salaryId, salaryNote.noteHash, salaryId, employer.privateKey);
      await salaryDappContract.approveSalaryNotional(
        salaryNoteHash,
        salariesignature,
        salaryId,
      );
      // const salaryId = numberOfsalaries;
      // numberOfsalaries += 1;
      return salaryId;
    },
    addSettlementCurrency: async () => {
      await salaryDappContract.addSettlementCurrency(
        defaultSalaryData.settlementCurrencyId,
        zkerc20Contract.address,
        {
          from: accounts[0],
        },
      );
    },
    withdrawSalary: async (currentBalance, duration) => {
      // if currentBalance is 0 we have to change this as the ratio is infinite
      //
      const { notionalNote, currentSalaryBalance } = defaultSalaryData;
      const currentSalary = currentBalance;


      const salaryId = await salaryDappContract.salaries(0);
      const ratio1 = getFraction(defaultSalaryData.totalDuration / duration * 10000);
      const withdrawSalary = computeRemainderNoteValue(notionalNote.k.toNumber(), ratio1.denominator, ratio1.numerator);

      const remainderNote2 = await aztec.note.create(employee.publicKey, withdrawSalary.remainder);
      const withdrawSalaryNote = await aztec.note.create(employee.publicKey, withdrawSalary.expectedNoteValue, employee.address);

      const { proofData: proofData1 } = aztec.proof.dividendComputation.encodeDividendComputationTransaction({
        inputNotes: [notionalNote],
        outputNotes: [withdrawSalaryNote, remainderNote2],
        za: ratio1.numerator,
        zb: ratio1.denominator,
        senderAddress: salaryId,
      });

      let changeValue = currentSalary - withdrawSalary.expectedNoteValue;
      changeValue = changeValue < 0 ? 0 : changeValue;


      const changeNote = await aztec.note.create(employer.publicKey, changeValue, salaryId);
      const { proofData: proofData2 } = aztec.proof.joinSplit.encodeJoinSplitTransaction({
        inputNotes: [currentSalaryBalance],
        outputNotes: [withdrawSalaryNote, changeNote],
        inputNoteOwners: [],
        senderAddress: salaryId,
        publicOwner: employer.address,
        kPublic: 0,
      });

      return {
        proofs: [proofData1, proofData2],
        notes: {
          changeNote,
          withdrawSalaryNote,
        },
      };
    },
    withdrawBalance: async (withdrawAmount) => {
      const { currentSalaryBalance } = defaultSalaryData;
      const salaryId = await salaryDappContract.salaries(0);
      const changeNote = await aztec.note.create(employer.publicKey, currentSalaryBalance.k.toNumber() - withdrawAmount, salaryId);
      defaultSalaryData.currentSalaryBalance = changeNote;
      const withdrawNote = await aztec.note.create(employer.publicKey, withdrawAmount);
      // withdraw
      const { proofData } = aztec.proof.joinSplit.encodeJoinSplitTransaction({
        inputNotes: [currentSalaryBalance],
        outputNotes: [withdrawNote, changeNote],
        inputNoteOwners: [],
        senderAddress: salaryId,
        publicOwner: employer.address,
        kPublic: 0,
      });

      return proofData;
    },
    depositBalance: async (amount) => {
      const { currentSalaryBalance } = defaultSalaryData;
      const salaryId = await salaryDappContract.salaries(0);
      const changeNote = await aztec.note.create(employer.publicKey, currentSalaryBalance.k.toNumber() + amount, salaryId);
      defaultSalaryData.currentSalaryBalance = changeNote;
      const withdrawNote = await aztec.note.create(employer.publicKey, 0);
      const settlementNote = await mintSettlementNote(amount, employer);

      const { noteHash } = settlementNote.exportNote();

      const signature = signNote(zkerc20Contract.address, noteHash, salaryId, employer.privateKey);

      await zkerc20Contract.confidentialApprove(noteHash, salaryId, true, signature, {
        from: employer.address,
      });
      // withdraw
      const { proofData } = aztec.proof.joinSplit.encodeJoinSplitTransaction({
        inputNotes: [currentSalaryBalance, settlementNote],
        inputNoteOwners: [],
        outputNotes: [withdrawNote, changeNote],
        senderAddress: salaryId,
        publicOwner: employer.address,
        kPublic: 0,
      });
      return proofData;
    },

    employer,
    employee,
    defaultsalary: async (withdrawSalary) => {
      const salaryId = await salaryDappContract.salaries(0);

      const { proofData } = await aztec.proof.privateRange.encodePrivateRangeTransaction({
        originalNote: withdrawSalary,
        comparisonNote: defaultSalaryData.currentSalaryBalance,
        senderAddress: salaryId,
      });
      return proofData;
    },
    repaySalary: async (outstandingSalary, changeNote) => {
      const changeValue = changeNote.k.toNumber();

      const remainingValue = defaultSalaryData.totalSalary - changeValue;
      const employeeRepaymentNote = await aztec.note.create(employee.publicKey, defaultSalaryData.totalSalary, employee.address);
      const employerRepaymentNote = await mintSettlementNote(remainingValue, employer);
      const { noteHash } = employerRepaymentNote.exportNote();

      const salaryId = await salaryDappContract.salaries(0);
      const repaymentSignature = signNote(zkerc20Contract.address, noteHash, salaryId, employer.privateKey);

      await zkerc20Contract.confidentialApprove(noteHash, salaryId, true, repaymentSignature, {
        from: employer.address,
      });


      const { proofData: proof3Data } = aztec.proof.joinSplit.encodeJoinSplitTransaction({
        inputNotes: [defaultSalaryData.currentSalaryBalance, employerRepaymentNote],
        inputNoteOwners: [],
        outputNotes: [outstandingSalary, employeeRepaymentNote],
        senderAddress: salaryId,
        publicOwner: employee.address,
        kPublic: 0,
      });

      return [proof3Data];
    },


  };
};
