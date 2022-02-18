const { json } = require('express');
const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000",
    credentials: true
  }
});
const bodyParser = require('body-parser')
const mysql = require('mysql2');
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const cookieParser = require('cookie-parser');
const timetable = require('./routes/timetable')
const conn = require('./db')

var chat = {}
var player = {
}
var geolocation = [];
var timeGame=new Date('	Thu Oct 07 2021 18:53:00 GMT+0300 (Москва, стандартное время)').getTime();
var dead = []
var duel = [];
var developments = [];


io.use((socket, next)=>{
  conn.query(`SELECT * FROM event_data WHERE status_game = 1`, function(err,data){
    if(data.length==0 || err){
      socket.emit('closeSession');
      socket.disconnect();
      // console.log('fgdfgdfg');
      return;
    }
    // console.log(data[0].idSession);
    // console.log(socket.handshake.auth.token != data[0].idSession);
    if(socket.handshake.auth.token != data[0].idSession){
      socket.emit('closeSession');
      socket.disconnect();
      return;
    }
  })
  next();
})

let win = null;
let winRole = null;

io.on('connection', (socket) => {
  socket.on('back', data=>{
    // console.log(data)
  })
  // console.log(socket.handshake.auth);
  
  if(win == true && winRole != null){
    socket.emit('winAdmin', winRole)
  }

  socket.on('win', data=>{
    if(new Date().getTime() > timeGame){
      win = true;
      winRole = data;
      io.emit('winAdmin', data)
    }
    
  })

  socket.on('sendChat', (data)=>{
    // io.to(data.room).emit('sendChat', {
    //   from:data.from,
    //   msg:data.msg,
    //   time:data.time
    // })

    let datas = new Date();
    let hours = 0;
    let minutes = 0;
    if(datas.getHours()<10){
        hours='0'+datas.getHours();
    }else{
      hours=datas.getHours();
    }

    if(datas.getMinutes()<10){
        minutes='0'+datas.getMinutes();
    }else{
        minutes=datas.getMinutes();
    }
    let time = hours+':'+minutes;
    // console.log(hours+':'+minutes)
    chat[data.room].push({
      id:uuidv4(),
      avtor:data.from,
      msg:data.msg,
      time:time,
      dataTime: datas.getTime(),
      img: player[socket.idPlayer].img
    })

    socket.broadcast.to(data.room).emit('sendChats', {
        id:uuidv4(),
        from:data.from,
        msg:data.msg,
        time:time,
        img: player[socket.idPlayer].img
      })
    let lastMsg = [];
    io.sockets.emit('msgList', {
          chat: chat
        })
    //// console.log(chat)
  })

  socket.on('adminChackStatus', data=>{
    socket.emit('getListPlayer', player);
    socket.emit('sendAdminDuel', duel);
    socket.emit('developments', developments);
  })



  socket.on('createPlayer', data=>{
    if(data.id == undefined){
      return;
    }
    if(new Date().getTime() <= timeGame){
      let interval = new Date() - new Date(timeGame);
      socket.emit('setTimeGame', interval);
      // console.log('game is not start')
    }

    if(player[data.id]){
      player[data.id].idSocket = socket.id;
      socket.idPlayer = data.id;
      socket.emit('changeData', player[data.id]);
      socket.emit('getListPlayer', player);
      
      return;
    }
    
      // console.log('game is not start'+ (new Date().getTime() < timeGame))
      // console.log('now '+ new Date())
      // console.log('timegame '+ new Date(timeGame))
      // console.log('game is not start'+ (new Date() - new Date(timeGame)))
    
    socket.idPlayer = data.id;
    // console.log(data.id)
    data.killCount = 0;
    data.idSocket = socket.id;
    player[socket.idPlayer] = data;
    socket.emit('changeData', player[data.id]);
    
    io.emit('getListPlayer', player);
  })

  socket.on('sendLocation', data=>{
    if(socket.idPlayer == undefined){
      socket.disconnect()
      return;
    }
    player[socket.idPlayer] = {...player[socket.idPlayer], location: data}

    if(player[socket.idPlayer].visible != undefined && player[socket.idPlayer].visible == false){
      geolocation[socket.idPlayer] = {
        id:socket.idPlayer,
        img: player[socket.idPlayer].img ? player[socket.idPlayer].img: '',
        location: data,
        visible:false
      }
      io.emit('sendLocationPlayer', geolocation)
      
      return;
    }

    geolocation[socket.idPlayer] = {
      id:socket.idPlayer,
      img: player[socket.idPlayer].img ? player[socket.idPlayer].img: '',
      location: data
    }
    // console.log(geolocation)
    io.emit('getListPlayer', player);
    io.emit('sendLocationPlayer', geolocation);
  })


  socket.on('connectRoom', data=>{
    if(chat[data] == null) chat[data] = new Array();
    socket.join(data)
    // console.log(chat[data])
    socket.emit('loadChats', chat[data]==null? []: chat[data])
  })

  socket.on('kill', id=>{
    let comment= '';
    if(player[id].duel && player[id].duel.battle){
      player[socket.idPlayer].coin = 0;
      player[socket.idPlayer].comment = 'Вы убили игрока, который участвовует в поединке!';
      socket.emit('setCoin', player[socket.idPlayer].coin);
      
      io.emit('getListPlayer', player);
      return;
    }


    



    if(player[socket.idPlayer].role == player[id].role){
      player[socket.idPlayer].coin = 0;
      player[socket.idPlayer].comment = 'Вы убили игрока той же роли что и вы!';
      player[id].coin = 0;
      socket.emit('setCoin', player[socket.idPlayer].coin);
      
      io.emit('getListPlayer', player);
    }else{
      //cюда код который ниже
    }
    const myID = socket.idPlayer;

    
    
    
    // player.forEach(element => {
    //   if(element.role == player[myID].role){
    //     return element;
    //   }
    // });
    // // console.log(`list all:${player.length} -> list end: ${playerList.length} `);
    


    player[myID].coin += player[id].coin;

    player[myID].killCount +=1;
    player[id].coin = 0;
    player[id].who = player[myID].role;

    let time = new Date().toLocaleTimeString();
    developments.unshift({
      id:myID,
      fullname: (player[myID].f+' '+player[myID].i),
      event: `Убил игрока "${player[id].f} ${player[id].i}"`,
      time:`${time.substr(0,5)}`
    })
    io.emit('developments', developments);


    socket.emit('setCoin', player[myID].coin);
  

    io.emit('getListPlayer', player);


  })

  socket.on('plusCoin', data=>{
    let coin = player[data.id].coin + data.coin;
    player[data.id].coin = coin
    //// console.log(io.to(player[data.id].idSocket));
    io.to(player[data.id].idSocket).emit('setCoin', player[data.id].coin)
    io.emit('getListPlayer', player);
  })
  socket.on('minusCoin', data=>{
    let coin = player[data.id].coin - data.coin;
    player[data.id].coin = coin
    //// console.log(io.to(player[data.id].idSocket));
    io.to(player[data.id].idSocket).emit('setCoin', player[data.id].coin)
    io.emit('getListPlayer', player);
  })
  socket.on('staticCoin', data=>{
    player[data.id].coin = data.coin
    //// console.log(io.to(player[data.id].idSocket));
    io.to(player[data.id].idSocket).emit('setCoin', player[data.id].coin)
    io.emit('getListPlayer', player);
  })

  socket.on('buyVisible', data=>{
    //player[socket.idPlayer] = {...player[socket.idPlayer], location: data}
    player[socket.idPlayer].visible = false
    player[socket.idPlayer].coin = (player[socket.idPlayer].coin - data.coin)<0?0:player[socket.idPlayer].coin - data.coin;
    let coin = player[socket.idPlayer].coin;

    socket.emit('setCoin', player[socket.idPlayer].coin<0?0:player[socket.idPlayer].coin);
    io.emit('getListPlayer', player);

    geolocation[socket.idPlayer] = {
      id:socket.idPlayer,
      img: player[socket.idPlayer].img ? player[socket.idPlayer].img: '',
      location: player[socket.idPlayer].location,
      visible:false
    }
    io.emit('sendLocationPlayer', geolocation);
    
    let time = new Date().toLocaleTimeString();
    developments.unshift({
      id: socket.idPlayer,
      fullname: (player[socket.idPlayer].f+' '+player[socket.idPlayer].i),
      event: `Купил невидимость на ${(data.time/1000/60).toFixed(1)} мин.`,
      time:`${time.substr(0,5)}`
    })
    io.emit('developments', developments);


    setTimeout(()=>{
      delete player[socket.idPlayer].visible;
      geolocation[socket.idPlayer] = {
        id:socket.idPlayer,
        img: player[socket.idPlayer].img ? player[socket.idPlayer].img: '',
        location: player[socket.idPlayer].location
      }
      io.emit('sendLocationPlayer', geolocation);
    },data.time)
  })

  socket.on('checkAdminDuel', (inx)=>{
    duel[inx].check = true;
    socket.emit('sendAdminDuel', duel);
  })

  socket.on('sendDuel', id=>{
    if(id == socket.idPlayer){

      // Оба игрока согласились на поединок а значит админ должен связаться с ними
      // через админ панель
      player[id].duel.agreement = true;
      player[player[id].duel.idDuel].duel.battle = true;
      player[player[id].duel.idDuel].duel.battleCheck = false;
      player[socket.idPlayer].duel.battle = true;
      player[socket.idPlayer].duel.battleCheck = false;

      duel.push({
        player1:player[id],
        player2:player[player[id].duel.idDuel],
        check:false
      })
      io.emit('sendAdminDuel', duel);
      io.emit('getListPlayer', player);

      return;
    }

    if(player[id].duel && player[id].duel.agreement == true){
      // отказ одного игрока
      delete player[socket.idPlayer].duel;
      //player[id].duel.battle = false;
      //player[id].duel.battleCheck = false;
      player[id].isNotDuel = true;
      delete player[id].duel;
      player[socket.idPlayer].coin = Math.floor(player[socket.idPlayer].coin/2);
      socket.emit('setCoin', player[socket.idPlayer].coin);
      io.emit('getListPlayer', player);
      return;
    }

    player[id].duel = {
      idDuel: socket.idPlayer,
      agreement: false,
    };
    player[socket.idPlayer].duel = {
      idDuel: id,
      agreement: true,
    }

    io.emit('getListPlayer', player);
  })

  socket.on('checkBattle', id=>{
    if(id == null){
      delete player[socket.idPlayer].isNotDuel;
      io.emit('getListPlayer', player);
      return;
    }
    player[id].duel.battleCheck = true;
    io.emit('getListPlayer', player);
  })

  //socket.on('getTimeServer', )


  socket.on('disconnectRoom', data=>{
    socket.leave(data)

    socket.emit('msgList', {
      chat: chat
    })
  })

  
  socket.emit('msgList', {
    chat: chat
  })

  // console.log('connectesdsd')
  //// console.log(socket.id)
});

app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({ extended: false }))
app.use('/uploads', express.static(__dirname + '/uploads'));
app.use('/static', express.static(__dirname + '/public'));
// parse application/json
app.use(bodyParser.json())
app.use(cookieParser('SECRET_KEY'))




// ------------ SERVER ----------------




// conn.connect(err=>{
//   if(err){
//     // console.log(err);
//     return err;
//   }else{
//     // console.log("DB ---- ok");
//   }
// })




app.get('/',(req, res) => {

  res.render('index')
  
});


const generateAccessToken= (id)=>{
  const payload = {
    id
  }
  return jwt.sign(payload, 'SECRET_KEY', {expiresIn: '1 days'});
}


app.post('/', (req, res)=>{
  if(!req.body) return res.redirect('/');
  conn.query(`SELECT * FROM useradmin WHERE username='${req.body.login}'`,(err,result)=>{
    // console.log(result);
    if(err){
      res.send('500 error').status(500);
      return;
    }
    if(result.length !== 0){
      if(bcrypt.compareSync(req.body.password,result[0].password)){
        const token = generateAccessToken(result[0].id);
        // console.log(token);
        res.cookie('token', token, {
          maxAge: 3600 * 48 * 1000,
          //expires:3600 * 24,
          secure: false, // это для https
        })
        res.redirect('/timetable')
      }else{
        res.redirect('/')
      }
    }else{
      res.redirect('/')
    }
    //res.status(200).send(bcrypt.compareSync('1234',result[0].password))
  })
  //if(req.body.login == 'maxSadov' && req.body.password == '1234') {res.redirect('/timetable')} else res.redirect('/')
})


  
  
  // if(jwt.verify(token, 'SECRET_KEY')){
  //   next();
  // }else{
  //   res.redirect('/')
  // }



// app.get('/timetable', authValidate, (req,res)=>{
//   res.render('timetable')
// })

// app.get('/timetable/:id', authValidate, async(req,res)=>{
//   const {id} = req.params;
//   await conn.promise().query(`SELECT * FROM clients_game WHERE id_group='${id}'`)
//     .then(([rows])=>{
//       // console.log(rows);
//       let data = [];
//       if(rows.length!=0){
//         data = rows;
//       }
//       res.render('gameGroup', {href: 1, data:data})
//   })
//   .catch(err=>{
//     res.send(err).status(500);
//   })
//   //res.render('gameGroup', {href: 1})
// })


app.use('/timetable', timetable)

app.get('/logout', (req,res)=>{
  res.clearCookie('token')
  
  res.redirect('/')
})

app.get('/getDateEvent', (req,res)=>{
  //res.render('cal')
  conn.query("SELECT * FROM `event_data`",(err,result)=>{
    if(err){
      res.status(500);
    }else{
      // console.log(result);
      res.json(result);
    }
    
  })
  
})

app.post('/newDateEvent', bodyParser.urlencoded({ extended: false }),(req,res)=>{
  const data = req.body;
  conn.query(`INSERT INTO event_data (id, occasion, invited_count, year, month, day, hex, status_game) VALUES (NULL, '${data.occasion}', '${data.invited_count}', '${data.year}', '${data.month}', '${data.day}', '${data.hex}', '0'); 
  SELECT LAST_INSERT_ID();`, function(err,data){
    if(err){
      res.status(500).json(err)
      return;
    }
    res.status(200).json(data[0]);
  })

})

app.get('/game', (req,res)=>{
  res.set("Cache-Control", "no-store, must-revalidate, max-age=0");
    res.set("Pragma", "no-cache");
    res.set("Expires" ,"Sat, 26 Jul 1997 05:00:00 GMT");
  conn.promise().query(`SELECT clients_game.id, clients_game.id_group, clients_game.fullname, clients_game.phone,clients_game.coins,event_data.hex, event_data.invited_count,
   event_data.occasion, clients_game.role, event_data.status_game, event_data.idSession FROM event_data LEFT JOIN clients_game ON event_data.id = clients_game.id_group 
   WHERE event_data.status_game = 1`)
   .then(([rows])=>{
      res.render('game', {href:2, data:rows, idSession:(rows[0]?rows[0].idSession:'')})
      // console.log(rows);
   })
   .catch(err=>{
     // console.log(err);
     res.status(500).send('500 error')
   })
})

app.post('/gameover', (req,res)=>{
  conn.query(`SELECT * FROM event_data WHERE status_game = 1`, function(err,data){
    if(data.length!=0){
        var chat = {}
        var player = {
        }
        var geolocation = [];
        var timeGame=new Date('	Thu Oct 07 2059 18:53:00 GMT+0300 (Москва, стандартное время)').getTime();
        var dead = []
        var duel = [];
        var developments = [];
        //io.emit('closeSession')
        io.emit('closeSession')
        io.disconnectSockets();
        conn.query(`UPDATE event_data SET status_game = '0', idSession = '' WHERE event_data.id = ${data[0].id}`)
        res.status(200).send('OK')
      }else{
        res.status(500).send('ERROR')
        return;
      }
  })
})

app.get('/chat', (req,res)=>{
  res.render('chat')
})

app.post('/startGame', (req,res)=>{
  let {id,time} =req.body;
  conn.query(`SELECT * FROM event_data WHERE status_game = 1`, function(err,data){
      if(data.length==0){
        chat = {}
        player = {}
        geolocation = [];
        win = null;
        winRole = null;
        timeGame= new Date(time);   //new Date('	Thu Oct 07 2021 18:53:00 GMT+0300 (Москва, стандартное время)').getTime();
        dead = [];
        conn.query(`UPDATE event_data SET status_game = '1', idSession = '${uuidv4()}' WHERE event_data.id = ${id}`)
        res.status(200).send('OK')
      }else{
        res.status(500).send('ERROR')
        // console.log('sdfsdfs');
        return;
      }
  })
  
  
})

app.get('/getServerTime', (req,res)=>{
  res.json({
    time: new Date().getTime()
  })
})

app.get('/getdata', (req,res)=>{
  res.json(player)
})

app.post('/idsession', (req,res)=>{
  const {idSession: id} = req.body;
  conn.query(`SELECT * FROM event_data WHERE status_game = 1`, function(err,data){
    if(data.length==0 || err){
      res.status(500).json({status:false})
      return;
    }
    // console.log(id);
    // console.log(data[0]);
    if(id == data[0].idSession){
      res.status(200).json({status:true})
    }else{
      res.status(500).json({status:false})
    }
  })
  
})

app.get('/getPlayer', (req,res)=>{
  // console.log(player)
  res.json({
    player: player
  })
  //// console.log(player)
})

app.get('/getLocation', (req,res)=>{
  res.json({
    loc: geolocation.filter(data=>data)
  })
})

app.get('/setPlayer', (req,res)=>{
  player[1].coin = player[1].coin-100
  res.json({
    player: player
  })
})


const multer = require('multer');


const storageConfig = multer.diskStorage({
  destination: (req, file, cb) =>{
      cb(null, "uploads");
  },
  filename: (req, file, cb) =>{
      cb(null, file.originalname);
  }
});

app.use(multer({storage:storageConfig}).single("filedata"));
app.post("/upload", function (req, res, next) {
  
   let filedata = req.file;
  // console.log(filedata)
   
  if(!filedata)
      res.json({
        status:'error'
      });
  else{
    player[filedata.filename.split('.')[0]].img = 'http://192.168.1.75:3000/uploads/'+filedata.filename;
    io.emit('getListPlayer', player);
      res.json({
        status:'ok'
      })
  }
});
var locc= [];
app.post('/ss',bodyParser.urlencoded({ extended: false }), (req,res)=>{
  // console.log(req.body);
  locc = req.body;
  res.json({
    data: 'ss'
  })
})

app.get('/ss',(req,res)=>{
  let login = 'admin2';
  let pass = bcrypt.hashSync('1234',7);
  res.send('sd')
  
  
})
const coords ={};
const user =[]


server.listen(3000, () => {
  // console.log(`listening on *:3000`);
});