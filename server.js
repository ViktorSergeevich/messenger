const express     = require('express'),
      app         = express(),
      WebSocket   = require('ws'),
      port        = 3000,
      MongoClient = require('mongodb').MongoClient,
      mongoClient = new MongoClient("mongodb://localhost:27017/", { useUnifiedTopology: true });

let userListDB, chatDB = [];

let wss = new WebSocket.Server({ port: 3001 });

app.use('/', express.static(__dirname + '/dist'));
app.get('/', (req, res) => {
    res.sendFile('index.html');
})

app.listen(port, () => {
    console.log(`Example app listening at http://localhost:${port}`)
})
mongoClient.connect(function (err, client) {
    if (err) client.close()

    let dbUsers = client.db('users');
    let dbChat =  client.db('chat');


    userListDB = dbUsers.collection('users');
    chatDB = dbChat.collection('chat');
});

// wss.on('connection', ws => {
//     ws.on('message', msg => {
//         ws.send(msg)
//     })
//     ws.on('close', () => {
//         console.log("disconnect")
//     })
// })

function existUser (user, callback) {
    userListDB.find({login: user}).toArray(function (error, list) {
        callback (list.length !== 0);
    });
}
// эта функция отвечает целиком за всю систему аккаунтов
function checkUser (user, password, callback) {
    // проверяем, есть ли такой пользователь
    existUser(user, function (exist) {
        // если пользователь существует
        if (exist) {
            // то найдем в БД записи о нем
            userListDB.find({login: user}).toArray(function (error, list) {
                // проверяем пароль
                callback (list.pop().password === password);
            });
        } else {
            // если пользователя нет, то регистрируем его
            userListDB.insert ({login: user, password: password}, {w:1}, function (err) {
                if (err) {throw err}
            });
            // не запрашиваем авторизацию, пускаем сразу
            callback (true);
        }
    });
}
function broadcast (by, message) {
    if (!message) throw new Error(console.log('empty message'));
    // запишем в переменную, чтоб не расходилось время
    let time = new Date().getTime();

    // отправляем по каждому соединению
    peers.forEach (function (ws) {
        ws.send (JSON.stringify ({
            type: 'message',
            message: message,
            from: by,
            time: time
        }));
    });

    // сохраняем сообщение в истории
    chatDB.insert ({message: message, from: by, time: time}, {w:1}, function (err) {
        if (err) {throw err}
    });
}
wss.on('connection', function (ws) {
    // проинициализируем переменные
    let login = '';
    let  registered = false;

    // при входящем сообщении
    ws.on('message', function (message) {
        // получаем событие в пригодном виде
        let event = JSON.parse(message);

        // если человек хочет авторизироваться, проверим его данные
        if (event.type === 'authorize') {
            // проверяем данные
            checkUser(event.user, event.password, function (success) {
                // чтоб было видно в другой области видимости
                registered = success;

                // подготовка ответного события
                let returning = {type:'authorize', success: success};

                // если успех, то
                if (success) {
                    // добавим к ответному событию список людей онлайн
                    returning.online = lpeers;

                    lpeers.push (event.user);
                    // добавим самого человека в список людей онлайн


                    // добавим ссылку на сокет в список соединений
                    peers.push (ws);

                    // чтобы было видно в другой области видимости
                    login = event.user;

                    //  если человек вышел
                    ws.on ('close', function () {
                        peers.exterminate(ws);
                        lpeers.exterminate(login);
                    });
                }

                // ну и, наконец, отправим ответ
                ws.send (JSON.stringify(returning));

                // отправим старые сообщения новому участнику
                if (success) {
                    sendNewMessages(ws);
                }
            });
        } else {
            // если человек не авторизирован, то игнорим его
            if (registered) {
                // проверяем тип события
                switch (event.type) {
                    // если просто сообщение
                    case 'message':
                        // рассылаем его всем
                        broadcast (login, event.message)
                        break;
                    // если сообщение о том, что он печатает сообщение
                    case 'type':
                        // то пока я не решил, что делать в таких ситуациях
                        break;
                }
            }
        }
    });
});

let lpeers = [];
let peers = [];

// функция отправки старых сообщений новому участнику чата
function sendNewMessages (ws) {
    chatDB.find().toArray(function(error, entries) {
        if (error) {throw error}
        entries.forEach(function (entry){
            entry.type = 'message';
            ws.send (JSON.stringify (entry));
        });
    });
}

// убрать из массива элемент по его значению
Array.prototype.exterminate = function (value) {
    this.splice(this.indexOf(value), 1);
}

