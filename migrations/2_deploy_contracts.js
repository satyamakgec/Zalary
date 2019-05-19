const ZalaryRegistry = artifacts.require("./ZalaryRegistry.sol");
const Dai = artifacts.require("./StableCoin.sol");
const Web3 = require("web3");

module.exports = async (deployer, network, accounts) => {
        
        await deployer.deploy(Dai);
        await deployer.deploy(ZalaryRegistry, Dai.address);
        console.log(
            `
            Zalary Registry: ${ZalaryRegistry.address}
            Dai Address: ${Dai.address}
            `
        );
}