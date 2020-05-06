const express = require('express');
const expressLayouts = require('express-ejs-layouts');
const bodyParser = require('body-parser');
var cookieParser = require('cookie-parser');
var session = require('express-session');

const app = express();
app.use(cookieParser());

const port = 6789;

// directorul 'views' va conține fișierele .ejs (html + js executat la server)
app.set('view engine', 'ejs');
// suport pentru layout-uri - implicit fișierul care reprezintă template-ul site-ului este views/layout.ejs
app.use(expressLayouts);
// directorul 'public' va conține toate resursele accesibile direct de către client (e.g., fișiere css, javascript, imagini)
app.use(express.static('public'))
// corpul mesajului poate fi interpretat ca json; datele de la formular se găsesc în format json în req.body
app.use(bodyParser.json());
// utilizarea unui algoritm de deep parsing care suportă obiecte în obiecte
app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({
    key: 'user_sid',
    secret: 'secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
        expires: 10000
    }
}));
session.user = null;

// la accesarea din browser adresei http://localhost:6789/ se va returna textul 'Hello World'
// proprietățile obiectului Request - req - https://expressjs.com/en/api.html#req
// proprietățile obiectului Response - res - https://expressjs.com/en/api.html#res
app.get('/', (req, res) =>{
    console.log('cookies: ', req.cookies);
    let user = req.cookies["utilizator"];
    let username=null;
    if (user){
        username = user["nume"];
    }
    //console.log("User : ", user);
    res.clearCookie('utilizator');
    res.render('index', {user: username});
});

const fs = require('fs');
let rawdata = fs.readFileSync('intrebari.json');
let listaIntrebari = JSON.parse(rawdata);
rawdata = fs.readFileSync('utilizatori.json');
let users = JSON.parse(rawdata);

// la accesarea din browser adresei http://localhost:6789/chestionar se va apela funcția specificată
app.get('/chestionar', (req, res) => {

    // în fișierul views/chestionar.ejs este accesibilă variabila 'intrebari' care conține vectorul de întrebări
    res.render('chestionar', {intrebari: listaIntrebari});
});

app.post('/rezultat-chestionar', (req, res) => {
    console.log(JSON.stringify(req.body));
    //res.send("formular: " + JSON.stringify(req.body));
    res.render('rezultat-chestionar', {intrebari: listaIntrebari, raspunsuri: JSON.stringify(req.body)});
});

app.get('/autentificare', (req, res) => {
    let user = req.cookies["autentificare_user"];
    let username=null;
    if (user){
        username = user["nume"];
        res.clearCookie('autentificare_user');
    }
    res.render('autentificare', {user: username});
});


app.post('/verificare-autentificare', (req, res) => {
    let user = req.body;
    console.log("Verificare user: ", user);
    let username = user.login[0],
        password = user.login[1];
    for (let index in users){
        if (username === users[index]["utilizator"] && password ===users[index]["parola"]){
            session.user = username;
            res.cookie("utilizator", {nume: username})
            res.cookie("autentificare_user", {nume: username})
        }
    }

    res.redirect('http://localhost:6789');
});

app.get('/log-out', (req, res) => {
    if (session.user){
        console.log("Sesiune utilziator: ",session.user);
        session.user = null;
    }
    res.redirect('http://localhost:6789');
});


app.listen(port, () => console.log(`Serverul rulează la adresa http://localhost:6789`));