var mysql = require("mysql");
var connection = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "root",
  database: "fintech1019",
});

connection.connect();

connection.query("SELECT * FROM user;", function (error, results, fields) {
  if (error) throw error;
  console.log(results);
});

connection.end();
