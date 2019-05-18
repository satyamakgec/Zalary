/* global artifacts */
import dotenv from 'dotenv';
import asyncForEach from '../utils/asyncForEach';

const ACE = artifacts.require('@aztec/protocol/contracts/ACE/ACE.sol');
const salaryDapp = artifacts.require('./ZalaryDapp.sol');
const SettlementToken = artifacts.require('./SettlementToken.sol');

const aztec = require('aztec.js');
const secp256k1 = require('@aztec/secp256k1');

dotenv.config();

const defaultSettlementCurrencyId = 1;

const defaultSalaryData = {
  notionalNote: undefined,
  viewingKey: '0x0368bac945f9aab61b51539fc295f0319b47cd89fb850dfb59a5676acad586d0c9',
  totalSalary: 10000,
  totalDuration: 10000,
  settlementCurrencyId: 0,
};

const getsalaryProofData = async ({
  salaryData,
  user,
  salaryDappContract,
} = {}) => {
  const {
    publicKey,
  } = user;
  const notionalNote = await aztec.note.create(publicKey, salaryData.totalSalary);
  const {
    noteHash: notionalNoteHash,
  } = notionalNote.exportNote();

  const newTotalNote = await aztec.note.create(publicKey, salaryData.totalSalary);
  const oldTotalNote = await aztec.note.createZeroValueNote();
  const {
    proofData,
  } = aztec.proof.mint.encodeMintTransaction({
    newTotalMinted: newTotalNote,
    oldTotalMinted: oldTotalNote,
    adjustedNotes: [notionalNote],
    senderAddress: salaryDappContract.address,
  });

  return {
    notionalNoteHash,
    proofData,
  };
};

class salaryService {
  constructor({
    salaryData = defaultSalaryData,
    contractOwner = secp256k1.accountFromPrivateKey(process.env.GANACHE_TESTING_ACCOUNT_0),
    employer = secp256k1.accountFromPrivateKey(process.env.GANACHE_TESTING_ACCOUNT_1),
    employee = secp256k1.accountFromPrivateKey(process.env.GANACHE_TESTING_ACCOUNT_2),
    settlementCurrencyId = defaultSettlementCurrencyId,
    settlementTokenContract = null,
    salaryDappContract = null,
  } = {}) {
    this.salaryData = salaryData;
    this.contractOwner = contractOwner;
    this.employer = employer;
    this.employee = employee;
    this.settlementCurrencyId = settlementCurrencyId;
    this.settlementTokenContract = settlementTokenContract;
    this.salaryDappContract = salaryDappContract;

    this.orderedStep = [
      'newSalaryDappContract',
      'newSettlementTokenContract',
      'addSettlementCurrency',
      'createSalary',
      'submitViewRequest',
      'approveViewRequest',
    ];

    this.startAtStep = 0;
  }

  advanceToStep = async (step) => {
    const stepIndex = this.orderedStep.indexOf(step);
    if (stepIndex < 0) return;

    const steps = this.orderedStep.slice(this.startAtStep, stepIndex + 1);
    await asyncForEach(steps, async (stepName) => {
      await this[stepName]();
    });
    this.startAtStep = stepIndex + 1;
  };

  newSalaryDappContract = async () => {
    const ace = await ACE.deployed();
    this.salaryDappContract = await salaryDapp.new(ace.address);
    return this.salaryDappContract;
  };

  newSettlementTokenContract = async () => {
    this.settlementTokenContract = await SettlementToken.new();
    return this.settlementTokenContract;
  };

  addSettlementCurrency = async ({
    id = this.settlementCurrencyId,
    user = this.contractOwner,
    settlementTokenContract = this.settlementTokenContract,
  } = {}) => {
    const transaction = await this.salaryDappContract.addSettlementCurrency(
      id,
      settlementTokenContract.address,
      {
        from: user.address,
      },
    );

    if (id === this.settlementCurrencyId) {
      this.settlementTokenContract = settlementTokenContract;
    }

    return transaction;
  };

  createSalary = async ({
    user = this.employer,
  } = {}) => {
    let {
      notionalNoteHash,
      proofData,
    } = this.salaryData;
    const verifiedProof = await getsalaryProofData({
      salaryData: this.salaryData,
      user,
      salaryDappContract: this.salaryDappContract,
    });
    if (!notionalNoteHash) {
      ({ notionalNoteHash } = verifiedProof);
    }
    if (!proofData) {
      ({ proofData } = verifiedProof);
    }
    const {
      viewingKey,
      totalSalary,
      totalDuration,
    } = this.salaryData;

    const transaction = this.salaryDappContract.createSalary(
      notionalNoteHash,
      viewingKey,
      user.publicKey,
      totalSalary,
      totalDuration,
      this.settlementCurrencyId,
      proofData,
      {
        from: user.address,
      },
    );

    const salaryId = await this.salaryDappContract.salaries(0);
    this.salaryData = {
      ...this.salaryData,
      salaryId,
      notionalNoteHash,
      proofData,
      settlementCurrencyId: this.settlementCurrencyId,
    };

    return transaction;
  };

  submitViewRequest = async ({
    user = this.employee,
  } = {}) => {
    const {
      salaryId,
    } = this.salaryData;

    return this.salaryDappContract.submitViewRequest(
      salaryId,
      user.publicKey,
      {
        from: user.address,
      },
    );
  };

  approveViewRequest = async ({
    employee = this.employee,
    user = this.employer,
  } = {}) => {
    const {
      salaryId,
      notionalNoteHash,
    } = this.salaryData;
    const sharedSecret = 'cf0767120273c3fc4046f6061618c2a502fc8b8';

    return this.salaryDappContract.approveViewRequest(
      salaryId,
      employee.address,
      notionalNoteHash,
      sharedSecret,
      {
        from: user.address,
      },
    );
  };
}

export default salaryService;
