/* global artifacts contract assert */
import moment from 'moment';
import salarySettlement from './helpers/salarySettlement.js';
import timeHelpers from './helpers/truffleTestHelpers';


const salaryDapp = artifacts.require('./ZalaryDapp.sol');
const ACE = artifacts.require('@aztec/protocol/contracts/ACE/ACE.sol');
const BilateralSwap = artifacts.require('@aztec/protocol/contracts/ACE/validators/bilateralSwap/BilateralSwap.sol');
const JoinSplit = artifacts.require('@aztec/protocol/contracts/ACE/validators/joinSplit/JoinSplit.sol');
const SettlementToken = artifacts.require('./SettlementToken.sol');
const ZKERC20 = artifacts.require('./ZKERC20.sol');
const Salary = artifacts.require('./Zalary.sol');


contract('Zalary', async (accounts) => {
  let salaryDappContract;
  let settlementToken;
  let zkerc20Contract;
  let joinSplitContract;
  let aceContract;
  let bilateralSwap;
  let salarySettlementService;
  let salary;

  beforeEach(async () => {
    const ace = await ACE.deployed();
    salaryDappContract = await salaryDapp.new(ace.address);
    settlementToken = await SettlementToken.deployed();
    joinSplitContract = await JoinSplit.deployed();
    bilateralSwap = await BilateralSwap.deployed();
    zkerc20Contract = await ZKERC20.deployed();
    aceContract = await ACE.deployed();

    salarySettlementService = salarySettlement({
      aceContract,
      zkerc20Contract,
      settlementToken,
      joinSplitContract,
      salaryDappContract,
      accounts,
    });
    await salarySettlementService.addSettlementCurrency();
    const salaryContractAddress = await salarySettlementService.createSalary();
    salary = await Salary.at(salaryContractAddress);
    await salarySettlementService.settleSalary();
    await timeHelpers.advanceTimeAndBlock(1000);
  });

  it('the employee should be able to widthdaw salary', async () => {
    const { proofs: [proofData1, proofData2] } = await salarySettlementService.withdrawSalary(10000, 500);
    await salary.withdrawSalary(
      proofData1,
      proofData2,
      500,
    );
  });

});
