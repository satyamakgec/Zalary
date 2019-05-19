const Sequelize = require('sequelize');
const EmployeeModel = require('../../models/employees')



const sequelize = new Sequelize('investor', 'root', 'Burton13#', {
  host: 'localhost',
  dialect: 'mysql',
  operatorsAliases: false,
});

const Employees = EmployeeModel(sequelize, Sequelize);

module.exports = {
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
