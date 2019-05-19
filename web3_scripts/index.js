const Web3 = require("web3");
const { table } = require("table");

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

  let employees = await contract.methods
    .getAllEmployeeByEmployer(employer)
    .call();

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

async function getPaymentsByEmployee(employee) {
  let contract = getContract();
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

/*
employee: address
startTime: Date
endTime: Date
amount: string
*/
async function schedulePayment(employee, startTime, endTime, amount) {
  let contract = getContract();

  let st = Math.floor(startTime.getTime() / 1000);
  let et = Math.floor(endTime.getTime() / 1000);
  let action = contract.methods.schedulePayment(
    employee,
    st,
    et,
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

  return contract.methods
    .withdrawPayment(chequeNo.toString(), false)
    .send({ from: (await web3.eth.getAccounts())[0] });
}

async function getEmployer(address) {
  let contract = getContract();

  return await contract.methods.employers(address).call();
}

async function getDaiTokens(amount) {
  let contract = getDaiContract();
  let action = contract.methods.getTokens(
    web3.utils.toWei(amount),
    (await web3.eth.getAccounts())[0]
  );
  return sendTransaction(action);
}

async function approveDai(amount) {
  let contract = getDaiContract();
  let action = contract.methods.approve(
    getContract().options.address,
    web3.utils.toWei(amount)
  );
  return sendTransaction(action);
}

function getDaiContract() {
  let contractABI = JSON.parse(
    require("fs")
      .readFileSync(`${__dirname}/../build/contracts/StableCoin.json`)
      .toString()
  ).abi;
  let contractAddress = "0x6713Aae570737D44a95F04751C7eC8c6c3c6846B";
  let contract = new web3.eth.Contract(contractABI, contractAddress);
  contract.setProvider(web3.currentProvider);
  return contract;
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
  if (employer.id === "0") {
    await getDaiTokens("100000");
    await addEmployer("0x0a519b4b6501f92e8f516230b97aca83257b0c01");
  }

  // await schedulePayment(
  //   "0x0A519B4B6501F92e8f516230b97ACa83257B0C01",
  //   new Date("May 19, 2019 19:15:00"),
  //   new Date("May 20, 2020 10:05:00"),
  //   "123.45"
  // );
  // await schedulePayment(
  //   "0xE6EE6E95b92BF320a8787AaB082b17331a449dB6",
  //   new Date("May 20, 2019 11:13:00"),
  //   new Date("June 20, 2019 11:13:00"),
  //   "67.89"
  // );

  let result = await getPaymentsByEmployee(
    "0xE6EE6E95b92BF320a8787AaB082b17331a449dB6"
  );
  console.log(
    "Paymanets by Employee 0xE6EE6E95b92BF320a8787AaB082b17331a449dB6"
  );
  let dataTable = [
    [
      "Employer",
      "From time",
      "To time",
      "Amount",
      "Withdrawn",
      "Last withdraw",
      "Cheque No."
    ]
  ];
  for (const r of result) {
    dataTable.push([
      r.employer,
      r.startTime.toLocaleDateString(),
      r.endTime.toLocaleDateString(),
      r.amount,
      r.releasedAmount,
      r.lastReleasingTime.toLocaleDateString(),
      r.chequeNo
    ]);
  }
  console.log();
  console.log(table(dataTable));

  let result2 = await getPaymentsByEmployer(
    "0x0A519B4B6501F92e8f516230b97ACa83257B0C01"
  );
  console.log(
    "Paymanets by Employer 0x0A519B4B6501F92e8f516230b97ACa83257B0C01"
  );
  let dataTable2 = [
    [
      "Employee",
      "From time",
      "To time",
      "Amount",
      "Withdrawn",
      "Last withdraw",
      "Cheque No."
    ]
  ];
  for (const r of result2) {
    dataTable2.push([
      r.employee,
      r.startTime.toLocaleDateString(),
      r.endTime.toLocaleDateString(),
      r.amount,
      r.releasedAmount,
      r.lastReleasingTime.toLocaleDateString(),
      r.chequeNo
    ]);
  }
  console.log();
  console.log(table(dataTable2));

  console.log(
    web3.utils.fromWei(
      await getDaiContract()
        .methods.balanceOf(getContract().options.address)
        .call()
    )
  );
  //await approveDai("1000");
  //await addFunds("1000");
  await withdrawPayment(1);
}

start();
