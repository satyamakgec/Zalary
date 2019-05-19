const Web3 = require('web3');
const Tx = require('ethereumjs-tx');
const Moment = require('moment')

const { Code, Investor, Kyccheck, Employees } = require('./helpers/sequelize')

const zalaryRegistryAddress = "0x359350407c62448fbd6841f3e808022105a4d628";
const stableCoinAddress = "0x24ef379be48308de694417dff436aa53b199df0f";

const web3 = new Web3(new Web3.providers.HttpProvider('http://kovan.infura.io/v3/57243a8f8787423f83f3a6d05d912581'));



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

  async function schedulePayment(employee, startTime, endTime, amount) {

    let contract = await getContract();

    // let st = Math.floor(startTime.getTime() / 1000);
    // let et = Math.floor(endTime.getTime() / 1000);
    let action = contract.methods.schedulePayment(
      employee,
      startTime,
      endTime,
      web3.utils.toWei(amount)
    );
    return await sendTransaction(action, zalaryRegistryAddress);
  }

  async function getPaymentsByEmployer(employer) {
    let contract = await getContract();

    console.log(employer);

    let employees = await contract.methods
      .getAllEmployeeByEmployer(employer)
      .call();

      console.log("employees ", employees);

    let calls = [];
    for (const employee of employees) {
      calls.push(contract.methods.paymentsSchedule(employer, employee).call);
    }
    let payCheques = await makeBatchRequest(calls);
    const calls2 = [];
    for (const chequeNo of payCheques) {
      calls2.push(contract.methods.payCheque(chequeNo).call);
    }
    let payments = await makeBatchRequest(calls2);

    let result = [];
    for (let i = 0; i < payments.length; i++) {
      const pay = payments[i];
      const chequeNo = payCheques[i];
      result.push({
        employee: pay[1],
        startTime: epochToDate(pay[2]),
        endTime: epochToDate(pay[3]),
        amount: web3.utils.fromWei(pay[4].toString()),
        lastReleasingTime: epochToDate(pay[5]),
        releasedAmount: web3.utils.fromWei(pay[6].toString()),
        chequeNo: chequeNo
      });
    }

    return result;
  }

  function makeBatchRequest(calls) {
  let batch = new web3.BatchRequest();

  let promises = calls.map(call => {
    return new Promise((res, rej) => {
      let req = call.request({}, (err, data) => {
        if (err) rej(err);
        else res(data);
      });
      batch.add(req);
    });
  });
  batch.execute();

  return Promise.all(promises);
}

function epochToDate(epoch) {
  let result = new Date(0);
  result.setUTCSeconds(epoch);
  return result;
}

async function getPaymentsByEmployee(employee) {
  let contract = await getContract();
  let payCheques = await contract.methods
    .getEmployeeAllPayCheques(employee)
    .call();

  const calls = [];
  const chequeNumbers = [];
  for (const chequeNo of payCheques) {
    chequeNumbers.push(chequeNo);
    calls.push(contract.methods.payCheque(chequeNo).call);
  }

  let payments = await makeBatchRequest(calls);
  let result = [];
  for (let i = 0; i < payments.length; i++) {
    const pay = payments[i];
    const chequeNo = chequeNumbers[i];
    result.push({
      employer: pay[0],
      startTime: epochToDate(pay[2]),
      endTime: epochToDate(pay[3]),
      amount: web3.utils.fromWei(pay[4].toString()),
      lastReleasingTime: epochToDate(pay[5]),
      releasedAmount: web3.utils.fromWei(pay[6].toString()),
      chequeNo: chequeNo
    });
  }

  return result;
}

exports.fund = async function(req, res) {

  let amount = "10000"

  let daiTransaction = await approveDai(amount)
  let transaction = await addFunds(amount);

  return res.send({transaction: transaction, daiTransaction: daiTransaction})

};

exports.schedule = async function(req, res) {

  var data = req.body;
  let scheduleTransaction = await schedulePayment(data.wallet, data.s, data.e, data.amount)
  return res.send({transaction: scheduleTransaction })

};

exports.index = async function(req, res) {


  let payments = await getPaymentsByEmployer((await web3.eth.getAccounts())[0])

  return res.send({payments: payments})

};

exports.employee = async function(req, res) {


  let payments = await getPaymentsByEmployee((await web3.eth.getAccounts())[0])

  return res.send({payments: payments})

}
