const express = require('express');
const expressLayouts = require('express-ejs-layouts');
const bodyParser = require('body-parser');
var cookieParser = require('cookie-parser');
var session = require('express-session');
var mongo = require('mongodb');
var MongoClient = mongo.MongoClient;
var ObjectId = mongo.ObjectID;
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

// proprietățile obiectului Request - req - https://expressjs.com/en/api.html#req
// proprietățile obiectului Response - res - https://expressjs.com/en/api.html#res
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
    let produse = await new Promise(((resolve, reject) => {
        let url = "mongodb://localhost:27017/";
        MongoClient.connect(url, {useUnifiedTopology: true,}, function(err, db) {
            if (err) throw err;
            var dbo = db.db("cumparaturi");
            dbo.collection("produse").find({}).toArray(function(err, result) {
                if (err) throw err;
                resolve(result);
                db.close();
            });
        });
    }));
    console.log(produse);
    //res.render('index', {user: username, produse: produse});
    res.render('index', {user: "fred", produse: produse});
});

const fs = require('fs');
let rawdata = fs.readFileSync('intrebari.json');
let listaIntrebari = JSON.parse(rawdata);
rawdata = fs.readFileSync('utilizatori.json');
let users = JSON.parse(rawdata);
rawdata = fs.readFileSync('movies.json');
let produse = JSON.parse(rawdata);

// la accesarea din browser adresei http://localhost:6789/chestionar se va apela funcția specificată
app.get('/chestionar', (req, res) => {

    // în fișierul views/chestionar.ejs este accesibilă variabila 'intrebari' care conține vectorul de întrebări
    res.render('chestionar', {intrebari: listaIntrebari});
});

app.post('/rezultat-chestionar', (req, res) => {
    console.log(JSON.stringify(req.body));
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

function createDatabase() {
    let url = "mongodb://localhost:27017/cumparaturi";
    MongoClient.connect(url, {useUnifiedTopology: true,}, async function (err, db) {
        if (err) throw err;
        console.log("Database created!");
        let dbo = db.db("cumparaturi");
        await dbo.collection("produse").drop( function(err, delOK) {
            if (err) throw err;
            if (delOK) console.log("Collection deleted");
            dbo.createCollection("produse", function(err, res) {
                if (err) throw err;
                console.log("Collection created!");
                db.close();
            })
        });
    });
}


function insertProduse(){
    let url = "mongodb://localhost:27017/";

    MongoClient.connect(url, {useUnifiedTopology: true,}, function(err, db) {
        if (err) throw err;
        let dbo = db.db("cumparaturi");
        console.log(produse);
        let myobj = {name: "Company Inc", address: "Highway 37"};
        dbo.collection("produse").insertMany(produse, function(err, res) {
            if (err) throw err;
            console.log("1 document inserted");
            db.close();
        });
    });
}

app.get("/creare-bd", async (req, res) => {
    await createDatabase();
    res.redirect("/");
});

app.get("/inserare-bd", async (req, res) => {
    await insertProduse();
    res.redirect("/");
});

function getProduct(id){
    return new Promise(((resolve, reject) => {
        let url = "mongodb://localhost:27017/";
        MongoClient.connect(url, {useUnifiedTopology: true,}, function(err, db) {
            if (err) throw err;
            let dbo = db.db("cumparaturi");
            let query = {"_id": ObjectId(id)};
            console.log(id);
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
    }));
}

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
            if (array_elements[i] != current) {
                if (cnt > 0) {
                    let produs = await getProduct(current);
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
            let produs = await getProduct(current);
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
        if (username === users[index]["utilizator"] && password ===users[index]["parola"]){
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
        console.log("Sesiune utilziator: ",session.user);
        session.user = null;
    }
    res.redirect('http://localhost:6789');
});


app.listen(port, () => console.log(`Serverul rulează la adresa http://localhost:6789`));