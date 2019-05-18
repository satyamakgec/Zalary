/* global contract assert */
import dotenv from 'dotenv';
import web3Events from './helpers/web3Events';
import {
  assertRevert,
} from './helpers/exceptions';
import salaryService from './helpers/salaryService';

const secp256k1 = require('@aztec/secp256k1');

dotenv.config();

contract('ZalaryDapp', async () => {
  let salary;

  const stranger = secp256k1.accountFromPrivateKey(process.env.GANACHE_TESTING_ACCOUNT_3);

  beforeEach(async () => {
    salary = new salaryService();
    await salary.advanceToStep('createSalary');
  });

  it('should trigger an event after submitting a view request', async () => {
    const transaction = await salary.submitViewRequest();

    const triggeredEvents = web3Events(transaction);
    assert.equal(triggeredEvents.count(), 1);

    const {
      employee,
      salaryData,
    } = salary;

    triggeredEvents.event('ViewRequestCreated').hasBeenCalledWith({
      salaryId: salaryData.salaryId,
      employee: employee.address,
      employeePublicKey: employee.publicKey,
    });
  });

  it('should allow more than one user to submit a view request', async () => {
    const transaction0 = await salary.submitViewRequest();

    const {
      employee,
      salaryData,
    } = salary;

    const events0 = web3Events(transaction0);
    events0.event('ViewRequestCreated').hasBeenCalledWith({
      salaryId: salaryData.salaryId,
      employee: employee.address,
      employeePublicKey: employee.publicKey,
    });

    const transaction1 = await salary.submitViewRequest({
      user: stranger,
    });

    const events1 = web3Events(transaction1);
    events1.event('ViewRequestCreated').hasBeenCalledWith({
      salaryId: salaryData.salaryId,
      employee: stranger.address,
      employeePublicKey: stranger.publicKey,
    });
  });

  it('should trigger an event after approving a view request', async () => {
    await salary.advanceToStep('submitViewRequest');

    const transaction = await salary.approveViewRequest();

    const triggeredEvents = web3Events(transaction);
    assert.equal(triggeredEvents.count(), 1);

    const {
      employee,
      salaryData,
    } = salary;

    const approvedEvent = triggeredEvents.event('ViewRequestApproved');
    approvedEvent.hasBeenCalledWith({
      salaryId: salaryData.salaryId,
      user: employee.address,
    });

    const accessId = approvedEvent.param('accessId');
    assert.equal(!!accessId.toString(), true);
    assert.equal(!!approvedEvent.param('sharedSecret'), true);
  });

  it('should not allow anyone other than employer to approve a view request', async () => {
    await salary.advanceToStep('submitViewRequest');

    const {
      employer,
    } = salary;
    assert.equal(stranger.address !== employer.address, true);

    await assertRevert(salary.approveViewRequest({
      user: stranger,
    }));
  });
});
