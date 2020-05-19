const express = require('express');
const expressLayouts = require('express-ejs-layouts');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const session = require('express-session');

const myDb = require('./modules/database.js');
const utilities = require('./modules/utilities.js');

const app = express();
const port = 6789;

app.set('view engine', 'ejs');                      // directorul 'views' va conține fișierele .ejs (html + js executat la server)
app.use(expressLayouts);                            // suport pentru layout-uri - implicit fișierul care reprezintă template-ul site-ului este views/layout.ejs
app.use(express.static('public'))                   // directorul 'public' va conține toate resursele accesibile direct de către client (e.g., fișiere css, javascript, imagini)
app.use(bodyParser.json());                         // corpul mesajului poate fi interpretat ca json; datele de la formular se găsesc în format json în req.body
app.use(bodyParser.urlencoded({ extended: true })); // utilizarea unui algoritm de deep parsing care suportă obiecte în obiecte
app.use(cookieParser());
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

app.get('/', async (req, res) =>{
    console.log('cookies: ', req.cookies);
    //let user = req.cookies["utilizator"];
    let username=null;
    if (session.user){
        //username = user["nume"];
        username = session.user;
    }
    //console.log("User : ", user);
    res.clearCookie('utilizator');
    let produse = await myDb.getItems();
    console.log(produse);
    res.render('index', {user: username, produse: produse});
});

(async function(){
    listaIntrebari = await utilities.readFileAsync("data/intrebari.json");
    users = await utilities.readFileAsync("data/utilizatori.json");
    produse = await utilities.readFileAsync("data/movies.json");
})();



app.get('/chestionar', (req, res) => {
    res.render('chestionar', {intrebari: listaIntrebari});
});

app.post('/rezultat-chestionar', (req, res) => {
    res.render('rezultat-chestionar', {intrebari: listaIntrebari, raspunsuri: JSON.stringify(req.body)});
});

app.get('/autentificare', (req, res) => {
    if(req.session.user){
        res.redirect("/");
        return;
    }
    let user = req.cookies["autentificare_user"];
    let username=null;
    if (user){
        username = user["nume"];
    }
    res.render('autentificare', {user: username});
});


app.get("/creare-bd", async (req, res) => {
    await myDb.createDatabase();
    res.redirect("/");
});

app.get("/inserare-bd", async (req, res) => {
    await myDb.populateDatabase(produse);
    res.redirect("/");
});


app.get("/vizualizare-cos", async (req, res) => {
    console.log("------------Vizualizare-----------")
    let detailed_items = []
    if (req.session.cart){
        let array_elements = req.session.cart;
        console.log(array_elements);
        array_elements.sort();
        let current = null;
        let cnt = 0;
        for (let i = 0; i < array_elements.length; i++) {
            if (array_elements[i] !== current) {
                if (cnt > 0) {
                    let produs = await myDb.getProductById(current);
                    console.log(produs)
                    detailed_items.push({titlu: produs.titlu, price: produs.price, cantitate: cnt});
                }
                current = array_elements[i];
                cnt = 1;
            } else {
                cnt++;
            }
        }
        if (cnt > 0) {
            let produs = await myDb.getProductById(current);
            console.log(produs)
            detailed_items.push({titlu: produs.titlu, price: produs.price, cantitate: cnt});
        }
        //console.log(detailed_items);
    }
    //res.render('index', {user: username, produse: produse});
    res.render("vizualizare-cos", {user: "fred", produse : detailed_items});
});

app.post('/verificare-autentificare', (req, res) => {
    let user = req.body;
    console.log("Verificare user: ", user);
    let username = user.login[0],
        password = user.login[1];
    for (let index in users){
        if (username === users[index]["utilizator"] && password===users[index]["parola"]){
            session.user = username;
            res.cookie("utilizator", {nume: username})
            res.cookie("autentificare_user", {nume: username})
        }
    }
    res.redirect('http://localhost:6789');
});

app.post('/adaugare_cos', (req, res) => {
    let item = req.body.id;
    console.log(item);
    if (req.session.cart === undefined){
        req.session.cart = [];
    }
    req.session.cart.push(item);
    //res.sendStatus(200);
    res.redirect("/");
});

app.get('/log-out', (req, res) => {
    if (session.user){
        console.log("Sesiune utilizator [Log-OUT]: ",session.user);
        session.user = null;
    }
    res.redirect('http://localhost:6789');
});

app.listen(port, () => console.log(`Serverul rulează la adresa http://localhost:6789`));