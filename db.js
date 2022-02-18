const mysql = require('mysql2');

const conn = mysql.createPool({
    connectionLimit:1,
    host:'localhost',
    user:'root',
    password:'root',
    database:'moscow_mafia',
    multipleStatements:true
  })

module.exports = conn;