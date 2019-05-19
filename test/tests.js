const ZalaryRegistry = artifacts.require('./ZalaryRegistry.sol');
const StableCoin = artifacts.require('./StableCoin.sol');

let zr;
let sc;

contract('ZalaryRegistry', async (accounts) => {

  before(async () => {
    zr = await ZalaryRegistry.deployed();
    sc = await StableCoin.deployed();
    await sc.getTokens(100000, accounts[0]);
  });

  it('should add employer', async () => {
    await zr.addEmployer(accounts[0], "0x0");
  });

  it('should add funds', async () => {
    await sc.approve(zr.address, 50000);
    await zr.addFunds(20000, accounts[0]);
  });

  it('should schedule payment', async () => {
    const now = (await web3.eth.getBlock("latest")).timestamp;
    await zr.schedulePayment(accounts[1], now, now + 100, 2000);
  });

  it('should withdraw payment', async () => {
    await zr.withdrawPayment(1, false);
  });
});
