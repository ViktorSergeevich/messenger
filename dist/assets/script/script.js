
const ws = new WebSocket('ws://localhost:3001');

const $ = document.getElementById.bind(document)

ws.onmessage = function (message) {
// приводим ответ от сервера в пригодный вид
    let event = JSON.parse(message.data);

// проверяем тип события и выбираем, что делать
    switch (event.type) {
        case 'message':
            if (event.from && specials_in(event))
            // рендерим само сообщение

            let name = document.createElement('h4');
            let icon = document.createElement('div');
            let body = document.createElement('p');
            let message = document.createElement('div');
            message.classList.add('message')

            console.log( 'event is = ', event);
            console.log( 'event from is = ', event.from);
            name.innerText = `user: ${event.from}`;
            body.innerText = specials_in(event);

            message.appendChild(name);
            message.appendChild(icon);
            message.appendChild(body);

            $('messages').appendChild (message);

            break;
        case 'authorize':
            // ответ на запрос об авторизации
            if (event.success) {
                $('messages').classList.remove('unauthorized');
                $('messages').classList.remove('unauthorized');
                $('login-form').classList.add('authorized');
                $('input-messages').classList.remove('unauthorized');
            }
            break;
        default:
            // если сервер спятил, то даем об себе этом знать
            console.log ('unknown event:', event)
            break;
    }
}
$('password').onkeydown = function (e) {
    if (e.which === 13) {
        // отправляем серверу событие authorize
        ws.send (JSON.stringify ({
            type: 'authorize',
            user: $('login').value,
            password: $('password').value
        }));
    }
}
// по нажатию Enter в поле ввода текста
$('input').onkeydown = function (e) {
    // если человек нажал Ctrl+Enter или Shift+Enter, то просто создаем новую строку.
    if (e.which === 13 && !e.ctrlKey && !e.shiftKey) {
        // отправляем серверу событие message
        ws.send (JSON.stringify ({
            type: 'message',
            message: specials_out($('input').innerText)
        }));
        $('input').innerText = ''; // чистим поле ввода
    }
}
// скроллим вниз при новом сообщении
var observer = new MutationObserver(function(mutations) {
    mutations.forEach(function(mutation) {
        var objDiv = $('messages');
        objDiv.scrollTop = objDiv.scrollHeight;
    });
}).observe($('messages'), { childList: true });

function specials_in (event) {
    var message = event.message;
    var moment = new Date(event.time);

    // получаем время в пригодном виде
    var time = (moment.getHours()<10)? '0'+moment.getHours() : moment.getHours();
    time = (moment.getMinutes()<10)? time+':0'+moment.getMinutes() : time+':'+moment.getMinutes();
    time = (moment.getSeconds()<10)? time+':0'+moment.getSeconds() : time+':'+moment.getSeconds();
    var date = (moment.getDate()<10)? '0'+moment.getDate() : moment.getDate();
    date = (moment.getMonth()<10)? date+'.0'+moment.getMinutes()+'.'+moment.getFullYear() : date+':'+moment.getMonth()+'.'+moment.getFullYear()


    message = message.replace(/\[time\]/gim, time);
    message = message.replace(/\[date\]/gim, date);

    return message;
}

function specials_out(message) {
    // /me
    message = message.replace(/\s*\/me\s/, $('login').value+' ');

    return message;
}

