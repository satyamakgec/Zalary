/* global contract assert */
import dotenv from 'dotenv';
import web3Events from './helpers/web3Events';
import blockTime from './helpers/blockTime';
import {
  assertRevert,
  assertInvalidOpcode,
} from './helpers/exceptions';
import salaryService from './helpers/salaryService';

const secp256k1 = require('@aztec/secp256k1');

dotenv.config();

contract('ZalaryFactory', async () => {
  let salaryDappContract;
  let salary;

  const stranger = secp256k1.accountFromPrivateKey(process.env.GANACHE_TESTING_ACCOUNT_3);

  beforeEach(async () => {
    salary = new salaryService();
    await salary.advanceToStep('newSalaryDappContract');
    ({ salaryDappContract } = salary);
  });

  it('should allow owner to add settlement currency', async () => {
    const {
      settlementCurrencyId,
    } = salary;
    const prevAddress = await salaryDappContract.settlementCurrencies(settlementCurrencyId);
    assert.equal(+prevAddress, 0);

    const newTokenContract = await salary.newSettlementTokenContract();
    await salary.addSettlementCurrency({
      settlementCurrencyId,
      settlementTokenContract: newTokenContract,
    });

    const currencyAddress = await salaryDappContract.settlementCurrencies(settlementCurrencyId);
    assert.equal(currencyAddress, newTokenContract.address);
  });

  it('should prevent non-owner to add settlement currency', async () => {
    const {
      settlementCurrencyId,
      contractOwner,
    } = salary;

    const newTokenContract = await salary.newSettlementTokenContract();
    assert.equal(stranger.address !== contractOwner.address, true);

    await assertRevert(salary.addSettlementCurrency({
      settlementCurrencyId,
      settlementTokenContract: newTokenContract,
      user: stranger,
    }));

    const currencyAddress = await salaryDappContract.settlementCurrencies(settlementCurrencyId);
    assert.equal(+currencyAddress, 0);
  });

  it('should fire an event after adding a settlement currency', async () => {
    const {
      settlementCurrencyId,
    } = salary;

    const newTokenContract = await salary.newSettlementTokenContract();

    const transaction = await salary.addSettlementCurrency({
      settlementCurrencyId,
      settlementTokenContract: newTokenContract,
    });

    const triggeredEvents = web3Events(transaction);
    assert.equal(triggeredEvents.count(), 1);

    triggeredEvents.event('SettlementCurrencyAdded').hasBeenCalledExactlyWith({
      id: settlementCurrencyId,
      settlementAddress: newTokenContract.address,
    });
  });

  it('should be able to create a salary', async () => {
    await salary.advanceToStep('addSettlementCurrency');

    await assertInvalidOpcode(salaryDappContract.salaries(0));

    await salary.createSalary();

    const firstsalaryAddress = await salaryDappContract.salaries(0);
    assert.equal(firstsalaryAddress > 0, true);
  });

  it('should trigger an event after creating a salary', async () => {
    await salary.advanceToStep('addSettlementCurrency');

    await assertInvalidOpcode(salaryDappContract.salaries(0));

    const transaction = await salary.createSalary();
    const {
      salaryData,
      settlementCurrencyId,
      employer,
    } = salary;

    const triggeredEvents = web3Events(transaction);
    assert.equal(triggeredEvents.count(), 2);

    const firstsalaryAddress = await salaryDappContract.salaries(0);
    const timestamp = await blockTime.fromTransaction(transaction);

    const createdEvent = triggeredEvents.event('salaryCreated');
    createdEvent.hasBeenCalledWith({
      id: firstsalaryAddress,
      employer: employer.address,
      employerPublicKey: employer.publicKey,
      totalSalary: salaryData.totalSalary,
      totalDuration: salaryData.totalDuration,
      createdAt: timestamp,
    });

    // const approvedEvent = triggeredEvents.event('NoteAccessApproved');
    // approvedEvent.hasBeenCalledWith({
    //   note: salaryData.notionalNote,
    //   user: employer.address,
    //   sharedSecret: salaryData.viewingKey,
    // });
    // const noteAccessId = approvedEvent.param('accessId');
    // assert.equal(!!noteAccessId.toString(), true);
  });
});
