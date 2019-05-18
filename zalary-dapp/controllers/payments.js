const Web3 = require('web3');
const Tx = require('ethereumjs-tx');
const Moment = require('moment')

const { Code, Investor, Kyccheck, Employees } = require('./helpers/sequelize')

const web3 = new Web3(new Web3.providers.HttpProvider('https://kovan.infura.io/887c33d3cd3e48a89f89cb3cf7888d3b'));

exports.index = async function(req, res) {

  return res.send({success: true})

};
