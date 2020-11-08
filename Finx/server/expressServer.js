const express = require('express')
const request = require("request");
const cors = require("cors");
const app = express()
var auth = require('./lib/auth');
var jwt = require('jsonwebtoken');

var mysql = require("mysql");
var connection = mysql.createConnection({
  host: "",
  user: "",
  password: "",
  database: "",
  multipleStatements: true
});
connection.connect();


app.set('views', __dirname + '/views');
//뷰 파일이 있는 디렉토리를 지정합니다.
app.set('view engine', 'ejs');
//여러가지 뷰 엔진중에서 ejs 를 사용하겠다 

const option = {
  origin: "http://localhost:3001",
  credentials: true
}

app.use(cors(option));

app.use(express.json());
//JSON 형태의 데이터 전송을 허용하겠다
app.use(express.urlencoded({ extended: false }));
//urlencoded 형식의 데이터 전송을 허용하겠다

app.use(express.static(__dirname + '/public'));
//정적 파일(디자인 플러그인 등)을 사용하기 위한 폴더 설정

app.get('/', function (req, res) {
  res.send('Hello World')
})

app.get('/signup', function (req, res) {
  res.render('signup');
})

app.get('/login', function (req, res) {
  res.render('login');
})

app.get('/authTest', auth, function (req, res) {
  console.log(req.decoded);
  //토큰에 있는 데이터 확인
  res.json("로그인 성공! / 컨텐츠를 볼 수 있습니다.")
})

app.get('/main', function (req, res) {
  res.render('main');
})

app.get('/balance', function (req, res) {
  res.render('balance');
})


app.get('/authResult', function (req, res) {
  var authCode = req.query.code;
  console.log(authCode);
  var option = {
    method: "POST",
    url: "https://testapi.openbanking.or.kr/oauth/2.0/token",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8"
    },
    //form 형태는 form / 쿼리스트링 형태는 qs / json 형태는 json ***
    form: {
      code: authCode,
      client_id: "pvudBjKis8mAxNMOrhaOGp7f1cfOYZIG1MdL8B1r",
      client_secret: "vMQ8H4dC6hTlH4T7pGovtZzfYHW7SAhTZoaz5IHR",
      redirect_uri: "http://localhost:3000/authResult",
      grant_type: "authorization_code"
      //#자기 키로 시크릿 변경
    },
  };
  request(option, function (err, response, body) {
    var accessRequestResult = JSON.parse(body); //JSON 오브젝트를 JS 오브젝트로 변경
    console.log(accessRequestResult);
    res.render("resultChild", { data: accessRequestResult }); //data 이름으로 resultChild 에 데이터 전달
  })
})

app.post('/signup', function (req, res) {
  var userName = req.body.userName;
  var userEmail = req.body.userEmail;
  var userPassword = req.body.userPassword;
  var userAccessToken = req.body.userAccessToken;
  var userRefreshToken = req.body.userRefreshToken;
  var userSeqNo = req.body.userSeqNo;
  var userInsertSql = "INSERT INTO user (`name`, `email`, `password`, `accesstoken`, `refreshtoken`, `userseqno`) VALUES (?, ?, ?, ?, ?, ?);"
  //데이터 베이스 서버에 전달할 SQL , 입력 변수는 ? <-- 표현으로... , ? <-- 안에 데이터는 connection.query function 에 2번째 [배열]
  connection.query(userInsertSql, [userName, userEmail, userPassword, userAccessToken, userRefreshToken, userSeqNo], function (error, results, fields) {
    if (error) throw error;
    else {
      res.json(1);
    }
  });
  console.log(req.body);
})

app.post('/login', function (req, res) {
  var userEmail = req.body.userEmail;
  var userPassword = req.body.userPassword;
  var userCheckSql = "SELECT * FROM user WHERE email = ?"
  connection.query(userCheckSql, [userEmail], function (error, results, fields) {
    if (error) throw error;
    else {
      if (results.length == 0) {
        res.json(2);
      }
      else {
        var storedPassword = results[0].password;
        if (userPassword == storedPassword) {
          var tokenKey = "fintech1234!" // 토큰키 추가
          jwt.sign(
            {
              userId: results[0].id,
              userEmail: results[0].email,
            },
            tokenKey,
            {
              expiresIn: "1d",
              issuer: "fintech.admin",
              subject: "user.login.info",
            },
            function (err, token) {
              console.log("로그인 성공", token);
              res.json(token);
            }
          );
        }
        else {
          //로그인 불가
          res.json(2);
        }
      }
    }
  });
})

app.post('/list', auth, function (req, res) {
  var userId = req.decoded.userId;
  //{ 토큰에 담겨있는 사용자 정보
  // "userId": 6,
  // "userEmail": "test@test.com",
  // "iat": 1600921603,
  // "exp": 1601008003,
  //"iss": "fintech.admin",
  //"sub": "user.login.info"
  //}
  var userSearchSql = "SELECT * FROM user WHERE id = ?";
  connection.query(userSearchSql, [userId], function (err, results) {
    if (err) throw err;
    else {
      var option = {
        method: "GET",
        url: "https://testapi.openbanking.or.kr/v2.0/user/me",
        headers: {
          "Authorization": "Bearer " + results[0].accesstoken
        },
        //form 형태는 form / 쿼리스트링 형태는 qs / json 형태는 json ***
        qs: {
          user_seq_no: results[0].userseqno
        },
      };
      request(option, function (err, response, body) {
        var listDataResult = JSON.parse(body); //JSON 오브젝트를 JS 오브젝트로 변경
        console.log(listDataResult);
        res.json(listDataResult)
      })
    }
  })
})

app.post('/balance', auth, function (req, res) {
  var userId = req.decoded.userId;
  var finusenum = req.body.fin_use_num;
  console.log(finusenum);
  //데이터베이스에 사용자 Accesstoken , 조회 후
  //금융위 API 잔액 조회 요청 만들고 데이터 그대로 response 하기

  var userSearchSql = "SELECT * FROM user WHERE id = ?";
  var countnum = Math.floor(Math.random() * 1000000000) + 1;
  // var countnum = "000000001";
  var transId = "T991667080U" + countnum; //이용기관번호 본인것 입력
  connection.query(userSearchSql, [userId], function (err, results) {
    if (err) throw err;
    else {
      var option = {
        method: "GET",
        url: "https://testapi.openbanking.or.kr/v2.0/account/balance/fin_num",
        headers: {
          "Authorization": "Bearer " + results[0].accesstoken
        },
        //form 형태는 form / 쿼리스트링 형태는 qs / json 형태는 json ***
        qs: {
          bank_tran_id: transId,
          fintech_use_num: finusenum,
          tran_dtime: "20201027144300"
        },
      };
      request(option, function (err, response, body) {
        var balanceData = JSON.parse(body); //JSON 오브젝트를 JS 오브젝트로 변경
        console.log(balanceData);
        res.json(balanceData)
      })
    }
  })
})

app.post('/transactionlist', auth, function (req, res) {
  var userId = req.decoded.userId;
  var finusenum = req.body.fin_use_num;
  var userSearchSql = "SELECT * FROM user WHERE id = ?";
  var countnum = Math.floor(Math.random() * 1000000000) + 1;
  // var countnum = "000000001";
  var transId = "T991667080U" + countnum; //이용기관번호 본인것 입력
  connection.query(userSearchSql, [userId], function (err, results) {
    if (err) throw err;
    else {
      var option = getTransactionListAPI(transId, finusenum, results[0].accesstoken);
      request(option, function (err, response, body) {
        var trasactionList = JSON.parse(body); //JSON 오브젝트를 JS 오브젝트로 변경
        res.json(trasactionList)
      })
    }
  })
})

app.post('/fixedlist', auth, function (req, res) {
  var finusenum = req.body.fin_use_num;
  var userSearchSql = "SELECT * FROM fix WHERE account_id = ?";
  connection.query(userSearchSql, [finusenum], function (err, results) {
    if (err) throw err;
    else {
      res.json(results);
    }
  })
})

app.post('/expectedExpenditure', auth, function (req, res) {
  var finusenum = req.body.fin_use_num;
  var userSearchSql = "SELECT SUM(money) as fixed FROM fix WHERE account_id = ?";
  connection.query(userSearchSql, [finusenum], function (err, results) {
    if (err) throw err;
    else {
      res.json(results);
    }
  })
})

app.post('/fix/find', auth, function (req, res) {
  var userId = req.decoded.userId;
  var finusenum = req.body.fin_use_num;
  var countnum = Math.floor(Math.random() * 1000000000) + 1;
  var transId = "T991667080U" + countnum;

  var sql1 = "SELECT * FROM fix WHERE account_id = ?; ";
  var sql2 = "SELECT * FROM user WHERE id = ?; ";

  var account_id = req.body.account_id;
  // var account_id = "199166708057887772847303";

  connection.query(sql1 + sql2, [account_id, userId], function (err, results) {
    if (err) {
      throw err;
    }
    else {
      var fixResult = results[0];
      var userResult = results[1];

      var fixContentListFromDB = [];
      for (var i = 0; i < fixResult.length; i++) {
        fixContentListFromDB.push(fixResult[i].content);
      }

      var option = getTransactionListAPI(transId, finusenum, userResult[0].accesstoken);
      request(option, function (err, response, body) {
        var trasactionList = JSON.parse(body);
        var resList = trasactionList["res_list"];
        var lastDayOfTwoMonthsAgo = getLastDayOfTwoMonthsAgo();
        var response = [];

        for (var i = 0; i < resList.length; i++) {
          var tran_monthDay = parseInt(resList[i].tran_date.substring(4, 8));
          if (tran_monthDay > lastDayOfTwoMonthsAgo) {
            break;
          }

          var payment_date = resList[i].tran_date.substring(6, 8);
          var print_content = resList[i].print_content;

          var filteredList = resList
            .filter(it => it.tran_date.substring(6, 8) == payment_date && it.print_content == print_content);

          if (filteredList.length > 2 && !fixContentListFromDB.includes(print_content)
            && response.filter(it => it.print_content == content).length == 0) {
            var fixTranAmtSum = filteredList.map(it => it.tran_amt).reduce((a, b) => parseInt(a) + parseInt(b));

            var fix = resList[i];
            fix.tran_amt = fixTranAmtSum / filteredList.length;
            response.push(resList[i]);
          }
        }
        response.push({ count: response.length });;
        res.json(response)
      })
    }
  });
})

function getTransactionListAPI(transId, finusenum, accesstoken) {
  var option = {
    method: "GET",
    url: "https://testapi.openbanking.or.kr/v2.0/account/transaction_list/fin_num",
    headers: {
      "Authorization": "Bearer " + accesstoken
    },
    qs: {
      bank_tran_id: transId,
      fintech_use_num: finusenum,
      inquiry_type: 'A',
      inquiry_base: 'D',
      from_date: '20200101',
      to_date: '20200101',
      sort_order: 'D',
      tran_dtime: '20201027144300'
    }
  }
  return option;
}

function getLastDayOfTwoMonthsAgo() {
  var d = new Date(),
    year = d.getFullYear(),
    month = '' + (d.getMonth() + -1);

  var lastDayOfTwoMonthsAgo = new Date((new Date(year, month, 1)) - 1);
  var day = lastDayOfTwoMonthsAgo.getDate();

  if (month.length < 2)
    month = '0' + month;
  if (day.length < 2)
    day = '0' + day;

  return month + day;
}


// app.post('/getData',function(req, res){
//   console.log(req.body);
//   var getUserId = req.body.sendUserId;
//   var getUserPassword = req.body.sendUserPassword;
//   console.log(getUserId, getUserPassword);
//   res.json(1);
// })

app.listen(3000);
