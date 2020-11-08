var mysql = require("mysql");
var connection = mysql.createConnection({
  host: "",
  user: "",
  password: "",
  database: "finx",
  multipleStatements: true
});

connection.connect();

connection.query("SELECT * FROM user;", function (error, results, fields) {
  if (error) throw error;
  console.log(results);
});

connection.end();
