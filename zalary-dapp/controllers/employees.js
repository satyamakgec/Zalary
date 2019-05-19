const Web3 = require('web3');
const Tx = require('ethereumjs-tx');
const Moment = require('moment')


const { Code, Investor, Kyccheck, Employees } = require('./helpers/sequelize')

const zalaryRegistryAddress = "0x447b5bAa5DBE907E32e0E73F70187257CeEC333A";
const stableCoinAddress = "0xf0bd362d8223e97280508eEc735A3F440b6C6328";

const web3 = new Web3(new Web3.providers.HttpProvider('http://localhost:8545'));

exports.index = async function(req, res) {

  var whereStatement = {};

  if(req.params.id != null) {
    whereStatement.id = req.params.id;
  }

  console.log("where statement", whereStatement);

    // GET THE TOKEN SYMBOL & ANY KYC CHECK INITIATED
      Employees.findAll(
        {
          attributes: ['id', 'first_name', 'last_name', 'job_title', 'wallet_address'], where: whereStatement
        }).then(token => {
          res.json(token);
        })
};

exports.add = async function(req, res) {

  var employee = await Employees.findByPk(req.body.id);
  if (employee) {
    employee.update({
      first_name: req.body.first_name,
      last_name: req.body.last_name,
      job_title: req.body.job_title,
      wallet_address: req.body.wallet_address
    }). then(
      updateUser => {
        return res.send({updateUser: updateUser});
      }
    )
  } else {
    Employees.create({
      first_name: req.body.first_name,
      last_name: req.body.last_name,
      job_title: req.body.job_title,
      wallet_address: req.body.wallet_address
    }). then(
      newUser => {
        return res.send({newUser: newUser});
      }

    )
  }

};

exports.del = async function(req, res) {
  
  var employee = await Employees.findByPk(req.params.id);
  employee.destroy();
  return res.send({success: true});

};

// Contract Work - DAI Tokens
async function getDaiTokens(amount) {
  let contract = getDaiContract();
  let action = contract.methods.getTokens(
    web3.utils.toWei(amount),
    (await web3.eth.getAccounts())[0]
  );
  return sendTransaction(action,stableCoinAddress);
}

async function approveDai(amount) {
  let contract = getDaiContract();
  let action = contract.methods.approve(
    getContract().options.address,
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

async function addEmployer(employer) {
  let contract = await getContract();
  let action = contract.methods.addEmployer(employer, web3.utils.fromAscii(""));
  return await sendTransaction(action,zalaryRegistryAddress);
}

async function getEmployer(address) {
  let contract = await getContract();

  return await contract.methods.employers(address).call();
}


exports.makeEmployer = async function(req, res) {

  var transaction = false;
  let employer = await getEmployer((await web3.eth.getAccounts())[0]);

  if (employer.id.toNumber() === 0) {
    await getDaiTokens("100000");
    transaction = await addEmployer((await web3.eth.getAccounts())[0]);
  }

  return res.send({transaction: transaction });

}
