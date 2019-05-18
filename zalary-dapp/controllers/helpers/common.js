const PolymathRegistryAbi = require('../artifacts/PolymathRegistryAbi')
const PolyTokenAbi = require('../artifacts/PolyTokenAbi')
const SecurityTokenRegistryAbi = require('../artifacts/SecurityTokenRegistryAbi')
const SecurityTokenAbi = require('../artifacts/SecurityTokenAbi')
const ModuleRegistryAbi = require('../artifacts/ModuleRegistryAbi')
const ModulesFactoryAbi = require('../artifacts/ModulesFactoryAbi')
const Tx = require('ethereumjs-tx');

exports.GetNonce = async function (web3, address) {

  let minNonce = 0;
  let nonce = await web3.eth.getTransactionCount(address);

  if (nonce < minNonce) {
    nonce = minNonce;
  }
  return nonce;
}

exports.getEventFromLogs = function (jsonInterface, logs, eventName) {
  let eventJsonInterface = jsonInterface.find(o => o.name === eventName && o.type === 'event');
  let log = logs.find(l => l.topics.includes(eventJsonInterface.signature));
  return web3.eth.abi.decodeLog(eventJsonInterface.inputs, log.data, log.topics.slice(1));
}

exports.getTokens = async function(address, web3) {

  const polymathRegistryAddress = '0x5b215a7D39Ee305AD28da29BF2f0425C6C2a00B3'; // Is this known in Production?
  const polymathRegistryAbi = PolymathRegistryAbi.modules.abi;
  const polymathRegistry = new web3.eth.Contract(polymathRegistryAbi, polymathRegistryAddress);
  polymathRegistry.setProvider(web3.currentProvider)

  const securityTokenRegistryAddress = await polymathRegistry.methods.getAddress("SecurityTokenRegistry").call();
  const securityTokenRegistryABI = SecurityTokenRegistryAbi.modules.abi;
  const securityTokenRegistry = new web3.eth.Contract(securityTokenRegistryABI, securityTokenRegistryAddress);
  securityTokenRegistry.setProvider(web3.currentProvider);

  let securityTokens = await securityTokenRegistry.methods.getTokensByOwner(address).call();
  let allTokens = []

  for (i = 0; i < securityTokens.length; i++) {
    //console.log(await securityTokenRegistry.methods.getSecurityTokenData(securityTokens[i]).call());
    allTokens.push(await securityTokenRegistry.methods.getSecurityTokenData(securityTokens[i]).call())
  }

  return allTokens

}

exports.getTransfterManager = async function(token, web3) {

  const polymathRegistryAddress = '0x5b215a7D39Ee305AD28da29BF2f0425C6C2a00B3'; // Is this known in Production?
  const polymathRegistryAbi = PolymathRegistryAbi.modules.abi;
  const polymathRegistry = new web3.eth.Contract(polymathRegistryAbi, polymathRegistryAddress);
  polymathRegistry.setProvider(web3.currentProvider)

  const securityTokenRegistryAddress = await polymathRegistry.methods.getAddress("SecurityTokenRegistry").call();
  const securityTokenRegistryABI = SecurityTokenRegistryAbi.modules.abi;
  const securityTokenRegistry = new web3.eth.Contract(securityTokenRegistryABI, securityTokenRegistryAddress);
  securityTokenRegistry.setProvider(web3.currentProvider);

  let securityTokenAddress = await securityTokenRegistry.methods.getSecurityTokenAddress(token).call();
  //securityToken.methods.getModulesByName(web3.utils.toHex('GeneralTransferManager')).call()

  let securityTokenABI = SecurityTokenAbi.module.abi;
  securityToken = new web3.eth.Contract(securityTokenABI, securityTokenAddress);
  securityToken.setProvider(web3.currentProvider);

  let gmtModules = await securityToken.methods.getModulesByName(web3.utils.toHex('GeneralTransferManager')).call()

  return gmtModules[0];

}

exports.getPermissionsManager = async function(token, web3, address) {

  async function getPolymathRegistry() {
    if (typeof _polymathRegistry === 'undefined') {
      let networkId = await web3.eth.net.getId();
      let polymathRegistryAddress = "0x5b215a7d39ee305ad28da29bf2f0425c6c2a00b3" // Hardcoded for KOVAN
      let polymathRegistryAbi = PolymathRegistryAbi.modules.abi;
      _polymathRegistry = new web3.eth.Contract(polymathRegistryAbi, polymathRegistryAddress);
      _polymathRegistry.setProvider(web3.currentProvider);
    }
    return _polymathRegistry;
  }

  async function getModuleRegistry() {
    if (typeof _moduleRegistry === 'undefined') {
      let polymathRegistry = await getPolymathRegistry();
      let moduleRegistryAddress = await polymathRegistry.methods.getAddress("ModuleRegistry").call();
      let moduleRegistryAbi = ModuleRegistryAbi.modules.abi;
      console.log("got this far 1");
      _moduleRegistry = new web3.eth.Contract(moduleRegistryAbi, moduleRegistryAddress);
      _moduleRegistry.setProvider(web3.currentProvider);
      console.log("got this far 2");
    }
    return _moduleRegistry;
  }

  getModuleFactoryAddressByName = async function (stAddress, moduleType, moduleName, address) {
      let moduleRegistry = await getModuleRegistry();

      console.log("got this far 3");
      console.log(moduleType, stAddress);

      let availableModules = await moduleRegistry.methods.getModulesByTypeAndToken(moduleType, stAddress).call();

      let result = null;
      let counter = 0;
      let moduleFactoryABI = ModulesFactoryAbi.modules.abi;

      while (result == null && counter < availableModules.length) {

        let moduleFactory = new web3.eth.Contract(moduleFactoryABI, availableModules[counter]);
        console.log("got this far 5");
        let currentName = web3.utils.toAscii(await moduleFactory.methods.name().call());
        if (currentName.localeCompare(moduleName) == 0) {
          result = moduleFactory.options.address;
        }
        counter++;
      }

      if (result == null) {
        throw new Error(`Module factory named ${moduleName} was not found.`);
      }

      return result;
    }

  const polymathRegistryAddress = '0x5b215a7D39Ee305AD28da29BF2f0425C6C2a00B3';  // this needs to change in production :: Hardcoded to KOVAN
  const polymathRegistryAbi = PolymathRegistryAbi.modules.abi;
  const polymathRegistry = new web3.eth.Contract(polymathRegistryAbi, polymathRegistryAddress);
  polymathRegistry.setProvider(web3.currentProvider)

  const securityTokenRegistryAddress = await polymathRegistry.methods.getAddress("SecurityTokenRegistry").call();
  const securityTokenRegistryABI = SecurityTokenRegistryAbi.modules.abi;
  const securityTokenRegistry = new web3.eth.Contract(securityTokenRegistryABI, securityTokenRegistryAddress);
  securityTokenRegistry.setProvider(web3.currentProvider);

  let securityTokenAddress = await securityTokenRegistry.methods.getSecurityTokenAddress(token).call();
  //securityToken.methods.getModulesByName(web3.utils.toHex('GeneralTransferManager')).call()

  let securityTokenABI = SecurityTokenAbi.module.abi;
  securityToken = new web3.eth.Contract(securityTokenABI, securityTokenAddress);
  securityToken.setProvider(web3.currentProvider);

  let gmtModules = await securityToken.methods.getModulesByName(web3.utils.toHex('GeneralPermissionManager')).call()

  if(gmtModules[0]) {
    // returns the GeneralPermissionsManager
    return gmtModules[0]
  } else {

    let permissionManagerFactoryAddress = await getModuleFactoryAddressByName(securityTokenAddress, 1, 'GeneralPermissionManager');

    let addModuleAction = securityToken.methods.addModule(permissionManagerFactoryAddress, web3.utils.fromAscii('', 16), 0, 0);

    console.log("this is your -", address);

    let addModuleTransaction = {
        from: address,
        to: permissionManagerFactoryAddress,
        data: addModuleAction.encodeABI(),
      };

    return {success: false, transaction: addModuleTransaction}
  }

}

exports.polyObjects = async function(web3, addressRequest,address,ticker,token_name, divisible, number_of_investors, more_info) {

  let tokenDivisibilty = (divisible == 'divisible') ? true : false
  let tokenInvestors = parseInt(number_of_investors)

  const polymathRegistryAddress = '0x5b215a7D39Ee305AD28da29BF2f0425C6C2a00B3'; // Is this known in Production?
  const polymathRegistryAbi = PolymathRegistryAbi.modules.abi;
  const polymathRegistry = new web3.eth.Contract(polymathRegistryAbi, polymathRegistryAddress);
  polymathRegistry.setProvider(web3.currentProvider)

  const securityTokenRegistryAddress = await polymathRegistry.methods.getAddress("SecurityTokenRegistry").call();
  const securityTokenRegistryABI = SecurityTokenRegistryAbi.modules.abi;
  const securityTokenRegistry = new web3.eth.Contract(securityTokenRegistryABI, securityTokenRegistryAddress);
  securityTokenRegistry.setProvider(web3.currentProvider);

  const tickerStatus = await securityTokenRegistry.methods.getTickerDetails(ticker).call();

  // check if ticker is available
  let available = (parseInt(tickerStatus[1]) === 0) ? true : false;

  // if it is not, check to see if it's owned by the User
  owned = (tickerStatus[0].toUpperCase() == address.toUpperCase()) ? true : false
  deployed = tickerStatus[4]
  ownedDeployed = (owned == true && deployed == true) ? true : false

  let regFee = await securityTokenRegistry.methods.getTickerRegistrationFee().call();
  let launchFee = await securityTokenRegistry.methods.getSecurityTokenLaunchFee().call();

  let polytokenAddress = await polymathRegistry.methods.getAddress("PolyToken").call();

  let polytokenABI = PolyTokenAbi.modules.abi;
  let polyToken = new web3.eth.Contract(polytokenABI, polytokenAddress);
  let polyBalance = await polyToken.methods.balanceOf(address).call();
  polyToken.setProvider(web3.currentProvider);

  // network calls
  let nonce = await web3.eth.getTransactionCount(address, 'pending');
  let block = await web3.eth.getBlock('latest');
  let networkGasLimit = block.gasLimit;

  // set data for registerTicker
  let registerData = await securityTokenRegistry.methods.registerTicker(address, ticker.toUpperCase(), token_name);

  let registerTicker = {
      from: address,
      to: securityTokenRegistryAddress,
      data: registerData.encodeABI(),
  };

  // set data for approve spend to 500 poly = cost of ticker and token creation
  let tickerApprove = await polyToken.methods.approve(securityTokenRegistryAddress, regFee * 2) // In current UI we confirm they want to pay.

  let approveSpend = {
      from: address,
      to: polytokenAddress,
      data: tickerApprove.encodeABI(),
      gasLimit: networkGasLimit,
      gasPrice: 8000000000,
      nonce: nonce
    };

  let createTokenData = await securityTokenRegistry.methods.generateSecurityToken(token_name, ticker, web3.utils.fromAscii(more_info), tokenDivisibilty)

  let createToken = {
      from: address,
      to: securityTokenRegistryAddress,
      data: createTokenData.encodeABI(),
      gasLimit: networkGasLimit,
      nonce: nonce
    };

  // get how much POLY the user has already approved
  let polyApproved = await polyToken.methods.allowance(address,securityTokenRegistryAddress).call();

  // check to see if the user has enough poly for where they are in the process
  polyRequired = "not available"
  // ticker is not registerData
  if(available == true && owned == false) {
      if(polyApproved >= (parseInt(regFee) + parseInt(launchFee))) {
        polyRequired = "already approved";
      } else if (polyApproved >= parseInt(regFee)) {
        polyRequired = "needs top up";
      } else {
        polyRequired = "needs to be approved";
      }
  } else if (available == false && owned == true) {
    if (polyBalance >= parseInt(regFee)) {
      polyRequired = "already approved";
    } else {
      polyRequired = "needs to be approved";
    }
  }

  if(addressRequest == 'securityTokenRegistry') {
    return {tickerAvailable: available, owned: owned, fees: regFee + launchFee,polyBalance: polyBalance, polyRequired: polyRequired, polyApproved: polyApproved, polyToken: polyToken, registerTicker: registerTicker, ownedDeployed: ownedDeployed, approveSpend: approveSpend, createToken: createToken  }
  }

  if(addressRequest == 'polyToken') {
    return {polyToken: polyToken, securityTokenRegistryAddress: securityTokenRegistryAddress, securityTokenRegistry : securityTokenRegistry, polyApproved: polyApproved}
  }

}

exports.polyObjects2 = async function(web3, address, token_name,ticker) {

  const polymathRegistryAddress = '0x5b215a7D39Ee305AD28da29BF2f0425C6C2a00B3'; // Is this known in Production?
  const polymathRegistryAbi = PolymathRegistryAbi.modules.abi;
  const polymathRegistry = new web3.eth.Contract(polymathRegistryAbi, polymathRegistryAddress);
  polymathRegistry.setProvider(web3.currentProvider)

  const securityTokenRegistryAddress = await polymathRegistry.methods.getAddress("SecurityTokenRegistry").call();
  const securityTokenRegistryABI = SecurityTokenRegistryAbi.modules.abi;
  const securityTokenRegistry = new web3.eth.Contract(securityTokenRegistryABI, securityTokenRegistryAddress);

  let polytokenAddress = await polymathRegistry.methods.getAddress("PolyToken").call();

  let polytokenABI = PolyTokenAbi.modules.abi;
  let polyToken = new web3.eth.Contract(polytokenABI, polytokenAddress);
  polyToken.setProvider(web3.currentProvider);

  let polyBalance = await polyToken.methods.balanceOf(address).call();

  let regFee = await securityTokenRegistry.methods.getTickerRegistrationFee().call();
  let tickerStatus = await polyToken.methods.approve(securityTokenRegistryAddress, regFee * 2) // In current UI we confirm they want to pay.
  let transactionData = await securityTokenRegistry.methods.registerTicker(address, ticker, token_namef.toUpperCase());

  // create a transaction to sign
  let nonce = await web3.eth.getTransactionCount(address, 'pending');
  let block = await web3.eth.getBlock('latest');
  let networkGasLimit = block.gasLimit;

  let approveSpend = {
      from: address,
      to: polytokenAddress,
      data: tickerStatus.encodeABI(),
      gasLimit: networkGasLimit,
      gasPrice: 8000000000,
      nonce: nonce
    };

  let registerTicker = {
      from: address,
      to: securityTokenRegistryAddress,
      data: transactionData.encodeABI(),
    };

  return {approve: approveSpend, register: registerTicker}


}
