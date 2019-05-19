const Web3 = require('web3');
const Tx = require('ethereumjs-tx');
const Moment = require('moment')

const { Code, Investor, Kyccheck, Employees } = require('./helpers/sequelize')

const zalaryRegistryAddress = "0x447b5bAa5DBE907E32e0E73F70187257CeEC333A";
const stableCoinAddress = "0xf0bd362d8223e97280508eEc735A3F440b6C6328";
const web3 = new Web3(new Web3.providers.HttpProvider('http://localhost:8545'));

exports.index = async function(req, res) {


  return res.send({success: true})

};

async function addFunds(amount) {
  let contract = await getContract();

  let action = contract.methods.addFunds(
    web3.utils.toWei(amount),
    (await web3.eth.getAccounts())[0]
  );
  return await sendTransaction(action,zalaryRegistryAddress);
}

async function approveDai(amount) {
  let contract = await getDaiContract();
  let action = contract.methods.approve(
    zalaryRegistryAddress,
    web3.utils.toWei(amount)
  );
  return sendTransaction(action,stableCoinAddress);
}

function getDaiContract() {
  let contractABI = JSON.parse(
    require("fs")
      .readFileSync(__dirname + "/artifacts/StableCoin.json")
      .toString()
  ).abi;
  let contractAddress = stableCoinAddress;
  let contract = new web3.eth.Contract(contractABI, contractAddress);
  contract.setProvider(web3.currentProvider);
  return contract;
}

async function getContract() {
  let contractABI = JSON.parse(
    require("fs")
      .readFileSync(__dirname + "/artifacts/ZalaryRegistry.json")
      .toString()
  ).abi;
  let contractAddress = zalaryRegistryAddress;
  let contract = new web3.eth.Contract(contractABI, contractAddress);
  contract.setProvider(web3.currentProvider);
  return contract;
}

async function sendTransaction(action, toAddress) {
  let from = (await web3.eth.getAccounts())[0];
  let gasLimit = await action.estimateGas();
  let result = {
    from: from,
    to: toAddress,
    gasLimit: gasLimit,
    data: action.encodeABI()
  };
  return result;
}


exports.fund = async function(req, res) {

  let amount = "10"

  let daiTransaction = await approveDai(amount)
  let transaction = await addFunds(amount);

  return res.send({transaction: transaction, daiTransaction: daiTransaction})

};
