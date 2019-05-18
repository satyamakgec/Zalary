const Sequelize = require('sequelize');
const AccessCodesModel = require('../../models/whitelist')
const InvestorModel = require('../../models/investors')
const KYCModel = require('../../models/kyccheck')
const EmployeeModel = require('../../models/employees')



const sequelize = new Sequelize('investor', 'root', 'Burton13#', {
  host: 'localhost',
  dialect: 'mysql',
  operatorsAliases: false,
});

const Code = AccessCodesModel(sequelize, Sequelize);
const Investor = InvestorModel(sequelize, Sequelize);
const Kyccheck = KYCModel(sequelize, Sequelize);
const Employees = EmployeeModel(sequelize, Sequelize);

module.exports = {
  Code,
  Investor,
  Kyccheck,
  Employees
}

// sequelize
// .authenticate()
// .then(() => {
//   console.log('Connection has been established successfully.');
// })
// .catch(err => {
//   console.error('Unable to connect to the database:', err);
// });
