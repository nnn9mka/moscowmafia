const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken')
const conn = require('../db')

const authValidate = (req,res,next) =>{
const token = req.cookies['token'];
// console.log("------------->"+token);
// console.log(req.cookies);
if(token == undefined || token==''){
    res.redirect('/')
    return;
}
jwt.verify(token, 'SECRET_KEY', (err, result)=>{
    if(err){
    
    // console.log(err);
    
    res.redirect('/')
    }else{
    req.id = result.id;
    next();
    }
});
}


router.get('/', authValidate, (req,res)=>{
    res.set("Cache-Control", "no-store, must-revalidate, max-age=0");
    res.set("Pragma", "no-cache");
    res.set("Expires" ,"Sat, 26 Jul 1997 05:00:00 GMT");
    res.render('timetable')
})

router.get('/change/:id', authValidate, (req,res)=>{
    const {id} = req.params;
    if(!Number(id).valueOf() == true){
        res.send('error 404').status(500);
        return;
    }
    conn.query(`SELECT * FROM clients_game WHERE id='${id}'`, function(err,result){
        
        if(result.length == 0){
            res.redirect('/timetable')
            return;
        }
        res.render('changeGameGroup', {href: 1, data: result[0]})
    })
    //res.render('changeGameGroup', {href: 1})
})
  
router.get('/:id', authValidate, async(req,res)=>{
    const {id} = req.params;
    if(!Number(id).valueOf() == true){
        res.send('error 404').status(500);
        return;
    }
    //res.header('Cache-Control', 'no-cache, private, no-store, must-revalidate, max-stale=0, post-check=0, pre-check=0');
    res.set("Cache-Control", "no-store, must-revalidate, max-age=0");
    res.set("Pragma", "no-cache");
    res.set("Expires: Sat, 26 Jul 1997 05:00:00 GMT");
    await conn.promise().query(`SELECT clients_game.id, clients_game.id_group, clients_game.fullname, clients_game.phone,clients_game.coins,event_data.hex,
    event_data.invited_count, event_data.occasion, clients_game.role, event_data.status_game  FROM event_data LEFT JOIN clients_game ON event_data.id = clients_game.id_group WHERE event_data.id = ${id}`)
        .then(([rows])=>{
        // console.log(rows[0]['status_game']);
        // if(rows.length == 0){
        //     res.redirect('/timetable')
        //     return;
        // }
        if(rows[0]['status_game'] == 1){
            res.redirect('/game');
            return;
        }
        let data = [];
        if(rows.length != 0 && rows[0].id != null){
            data = rows;
        }
        let metro = {hex: rows[0].hex, station:rows[0].invited_count, time:rows[0].occasion, id:id};
        res.render('gameGroup', {href: 1, data:data, metro:metro})
    })
    .catch(err=>{
        res.send('error 404').status(500);
    })
    //res.render('gameGroup', {href: 1})
})

router.post('/setrole', (req,res)=>{
    let data = req.body.data;
    data.map((data)=>{
        conn.query(`UPDATE clients_game SET role = '${data.role}' WHERE clients_game.id = '${data.id}'`)
    })
    
    // console.log(data);
    res.send('OK').status(200);
})

router.post('/:id', (req,res)=>{
    const {id} = req.params;
    let {fullname, phone, coins} = req.body;
    conn.query(`INSERT INTO clients_game (id, id_group, fullname, phone, coins,role) VALUES (NULL, '${id}', '${fullname}', '${phone}', '${coins}', '')`)
    res.status(200);
})

router.put('/changedata', (req,res)=>{
    let {id, time, station, hex} = req.body;
    conn.promise().query(`UPDATE event_data SET occasion = '${time}', invited_count = '${station}', hex = '${hex}' WHERE event_data.id = '${id}'`)
    .then(()=>{
        res.status(200).send('OK')
    })
    .catch((err)=>{
        // console.log(err);
        res.status(500).send('500 error');
    })
})

router.put('/:id', (req,res)=>{
    const {id} = req.params;
    let {fullname, phone, coins} = req.body;
    conn.query(`UPDATE clients_game SET fullname = '${fullname}', phone = '${phone}', coins = '${coins}' WHERE clients_game.id = ${id}`)
    res.status(200);
})

router.delete('/delete/:id', (req,res)=>{
    const {id} = req.params;
    conn.query(`DELETE FROM clients_game WHERE clients_game.id = '${id}'`)
    res.send("OK").status(200)
})

router.get('/delete/group/:id', (req,res)=>{
    const {id} = req.params;
    conn.query(`DELETE FROM event_data WHERE event_data.id = '${id}'`)
    res.status(200).redirect('/timetable')
})

module.exports = router;