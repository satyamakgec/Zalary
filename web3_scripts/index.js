const Web3 = require("web3");

async function initializeWeb3() {
  //let provider = await getInjectedProvider();
  //web3 = new Web3(provider);
  if (
    typeof web3 === "undefined" ||
    typeof Issuer === "undefined" ||
    typeof defaultGasPrice === "undefined"
  ) {
    web3 = new Web3(new Web3.providers.HttpProvider("http://localhost:8545"));
  }
}

async function getPaymentsByEmployer(employer) {
  let contract = getContract();

  let payments = await contract.methods.getPaymentsByEmployer(employer).call();
  let result = [];
  for (let i = 0; i < payments[0].length; i++) {
    let st = new Date(0);
    st.setUTCSeconds(payments[1][i]);
    let et = new Date(0);
    et.setUTCSeconds(payments[2][i]) / 1000;
    result.push({
      employer: payments[0][i],
      startTime: st,
      endTime: et,
      amount: web3.utils.fromWei(payments[3][i].toString())
    });
  }

  return result;
}

async function getPaymentsByEmployee(employee) {
  let contract = getContract();
  let payCheques = (await contract.methods
    .getEmployeeAllPayCheques(employee)
    .call()).map(pc => pc.toNumber());

  const calls = [];
  for (const chequeNo of payCheques) {
    calls.push(contract.methods.payCheque(chequeNo).call);
  }

  let payments = await makeBatchRequest(calls);
  let result = [];
  for (const pay of payments) {
    let st = new Date(0);
    st.setUTCSeconds(pay[2]);
    let et = new Date(0);
    et.setUTCSeconds(pay[3]);
    let lr = new Date(0);
    lr.setUTCSeconds(pay[5]);
    result.push({
      employer: pay[0],
      startTime: st,
      endTime: et,
      amount: web3.utils.fromWei(pay[4].toString()),
      lastReleasingTime: lr,
      releasedAmount: web3.utils.fromWei(pay[6].toString())
    });
  }

  return result;
}

/*
employee: address
startTime: Date
endTime: Date
amount: string
*/
async function schedulePayment(employee, startTime, endTime, amount) {
  let contract = getContract();

  let action = contract.methods.schedulePayment(
    employee,
    Math.floor(startTime.getTime() / 1000),
    Math.floor(endTime.getTime() / 1000),
    web3.utils.toWei(amount)
  );
  return await sendTransaction(action);
}

/*
amount: string
*/
async function addFunds(amount) {
  let contract = getContract();

  let action = contract.methods.addFunds(
    web3.utils.toWei(amount),
    (await web3.eth.getAccounts())[0]
  );
  return await sendTransaction(action);
}

/*
employer: address
*/
async function addEmployer(employer) {
  let contract = getContract();
  let action = contract.methods.addEmployer(employer, web3.utils.fromAscii(""));
  return await sendTransaction(action);
}

async function sendTransaction(action) {
  let from = (await web3.eth.getAccounts())[0];
  let gasLimit = await action.estimateGas();
  let result = await action.send({
    from: from,
    gasLimit: gasLimit
  });
  return result;
}

/*
chequeNo: number
*/
async function withdrawPayment(chequeNo) {
  let contract = getContract();

  await contract.methods
    .withdrawPayment(chequeNo, false)
    .send({ from: (await web3.eth.getAccounts())[0] });
}

async function getEmployer(address) {
  let contract = getContract();

  return await contract.methods.employers(address).call();
}

function makeBatchRequest(calls) {
  let batch = new web3.BatchRequest();

  let promises = calls.map(call => {
    return new Promise((res, rej) => {
      let req = call.request(undefined, (err, data) => {
        if (err) rej(err);
        else res(data);
      });
      batch.add(req);
    });
  });
  batch.execute();

  return Promise.all(promises);
}

function getContract() {
  let contractABI = JSON.parse(
    require("fs")
      .readFileSync(`${__dirname}/../build/contracts/ZalaryRegistry.json`)
      .toString()
  ).abi;
  let contractAddress = "0x99095Efc7569B3b8C631765fF849d7d5fE81b735";
  let contract = new web3.eth.Contract(contractABI, contractAddress);
  contract.setProvider(web3.currentProvider);
  return contract;
}

async function start() {
  await initializeWeb3();
  let employer = await getEmployer(
    "0x0a519b4b6501f92e8f516230b97aca83257b0c01"
  );
  console.log(employer.id.toNumber());
  // await addEmployer("0x0a519b4b6501f92e8f516230b97aca83257b0c01");
  // let date1 = new Date();
  // date1.setFullYear(2020);
  // let date2 = new Date();
  // date2.setMonth(9);
  // await schedulePayment(
  //   "0xE6EE6E95b92BF320a8787AaB082b17331a449dB6",
  //   new Date(),
  //   date1,
  //   "123.45"
  // );
  // await schedulePayment(
  //   "0xE6EE6E95b92BF320a8787AaB082b17331a449dB6",
  //   new Date(),
  //   date2,
  //   "67.89"
  // );

  let result = await getPaymentsByEmployee(
    "0xE6EE6E95b92BF320a8787AaB082b17331a449dB6"
  );
  console.log(result);
  console.log(result[0]);
  console.log(result[1]);
}

start();
