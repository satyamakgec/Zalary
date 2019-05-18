module.exports = (sequelize, type) => {
    return sequelize.define('Employees', {
        id: {
          type: type.STRING(45),
          primaryKey: true,
        },
        first_name: type.STRING(255),
        last_name : type.STRING(255),
        wallet_address : type.STRING(255),
        job_title : type.STRING(255),

    },{
      freezeTableName: true,
      timestamps: false,
      // define the table's name
    })
}
