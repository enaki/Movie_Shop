const express = require('express');
const expressLayouts = require('express-ejs-layouts');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const mongo = require('mongodb');
const fs = require('fs');

const MongoClient = mongo.MongoClient;
const ObjectId = mongo.ObjectID;

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

let myDb = {
    getItems: async function(){
        return new Promise((resolve, reject) => {
            let url = "mongodb://localhost:27017/";
            MongoClient.connect(url, {useUnifiedTopology: true,}, function(err, db) {
                if (err) throw err;
                let dbo = db.db("cumparaturi");
                dbo.collection("produse").find({}).toArray(function(err, result) {
                    if (err) throw err;
                    resolve(result);
                    db.close();
                });
            });
        });
    },
    createDatabase: async function(){
        return new Promise((resolve, reject) => {
            let url = "mongodb://localhost:27017/cumparaturi";
            MongoClient.connect(url, {useUnifiedTopology: true,},function (err, db) {
                if (err) throw err;
                console.log("Database created!");
                let dbo = db.db("cumparaturi");
                dbo.collection("produse").drop( function(err, delOK) {
                    if (err) throw err;
                    if (delOK) console.log("Collection 'produse' deleted");
                    dbo.createCollection("produse", function(err, res) {
                        if (err) throw err;
                        console.log("Collection 'produse' created!");
                        resolve();
                        db.close();
                    });
                });
            });
        });
    },
    populateDatabase: async function(){
        return new Promise((resolve, reject) => {
            let url = "mongodb://localhost:27017/";
            MongoClient.connect(url, {useUnifiedTopology: true,}, function(err, db) {
                if (err) throw err;
                let dbo = db.db("cumparaturi");
                dbo.collection("produse").insertMany(produse, function(err, res) {
                    if (err) throw err;
                    resolve();
                    db.close();
                });
            });
        });
    },
    getProductById: async function(id){
        return new Promise((resolve, reject) => {
            let url = "mongodb://localhost:27017/";
            MongoClient.connect(url, {useUnifiedTopology: true,}, function(err, db) {
                if (err) throw err;
                let dbo = db.db("cumparaturi");
                let query = {"_id": ObjectId(id)};
                dbo.collection("produse").find(query).toArray(function(err, result) {
                    if (err) throw err;
                    if (result.length > 0){
                        resolve(result[0]);
                    } else {
                        resolve(result);
                    }
                    db.close();
                });
            });
        });
    }
}


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

let listaIntrebari, users, produse;

fs.readFile('intrebari.json', function read(err, rawdata) {
    if (err) { throw err; }
    listaIntrebari = JSON.parse(rawdata)
});

fs.readFile('utilizatori.json', function read(err, rawdata) {
    if (err) { throw err; }
    users = JSON.parse(rawdata)
});

fs.readFile('movies.json', function read(err, rawdata) {
    if (err) { throw err; }
    produse = JSON.parse(rawdata)
});

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
    res.sendStatus(200);
});

app.get("/inserare-bd", async (req, res) => {
    await myDb.populateDatabase();
    res.sendStatus(200);
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