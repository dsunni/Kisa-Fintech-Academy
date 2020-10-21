const express = require('express')
const request = require('request')
const app = express()


app.set('views', __dirname + '/views');
//뷰 파일이 있는 디렉토리 지정

app.set('view engine', 'ejs');
// ejs 뷰 엔진 생성

app.use(express.json());
//JSON 데이터 전송 허용

app.use(express.urlencoded({ extended: false }));
//urlencoded 데이터 전송 허용

app.use(express.static(__dirname + '/public'));
//정적 파일(디자인 플러그인 등)을 사용하기 위한 폴더 설정

app.get('/', function (req, res) {
  res.send('Hello World')
})

app.get('/signup', function (req, res) {
  res.render('signup');
})

app.get('/authResult', function (req, res) {
  var authCode = req.query.code;
  console.log(authCode);

  var option = {
    method: "POST",
    url: "https://testapi.openbanking.or.kr/oauth/2.0/token",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded; charset=UTF8"
    },
    form: {
      code: authCode,
      client_id: "키",
      client_secret: "비밀키",
      redirect_uri: "http://localhost:3000/authResult",
      grant_type: "authorization_code"
    },
  };
  request(option, function (err, response, body) {
    console.log(body);
    res.json(body);
  })
})

// app.post('/getData',function(req, res){
//   console.log(req.body);
//   var getUserId = req.body.sendUserId;
//   var getUserPassword = req.body.sendUserPassword;
//   console.log(getUserId, getUserPassword);
//   res.json(1);
// })

app.listen(3000);
