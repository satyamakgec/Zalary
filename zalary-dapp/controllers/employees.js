const Web3 = require('web3');
const Tx = require('ethereumjs-tx');
const Moment = require('moment')


const { Code, Investor, Kyccheck, Employees } = require('./helpers/sequelize')


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

  console.log("did i get here");

  var employee = await Employees.findByPk(req.params.id);
  employee.destroy();
  return res.send({success: true});

};

// Contract Work

async function sendTransaction(action) {
  let from = (await web3.eth.getAccounts())[0];
  let gasLimit = await action.estimateGas();
  let result = {
    from: from,
    gasLimit: gasLimit,
    data: action
  };
  return result;
}

async function getContract() {
  let contractABI = JSON.parse(
    require("fs")
      .readFileSync(__dirname + "/artifacts/ZalaryRegistry.json")
      .toString()
  ).abi;
  let contractAddress = "0x373eFb83A48152D13cD7626974AD16de3Ec83109";
  let contract = new web3.eth.Contract(contractABI, contractAddress);
  contract.setProvider(web3.currentProvider);
  return contract;
}

async function addEmployer(employer) {
  let contract = await getContract();
  let action = contract.methods.addEmployer(employer, web3.utils.fromAscii(""));
  return await sendTransaction(action);
}

exports.makeEmployer = async function(req, res) {



  let transaction = await addEmployer('0xbe13466fa1e6c8a4f63cee76c7791cebe0d24a54');

  return res.send({transaction: transaction });


}
