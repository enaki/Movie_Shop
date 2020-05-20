const express = require('express');
const expressLayouts = require('express-ejs-layouts');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const path = require('path');


const myDb = require('./modules/database.js');
const utilities = require('./modules/utilities.js');

const app = express();
const port = 6789;

app.set('view engine', 'ejs');                      // directorul 'views' va conține fișierele .ejs (html + js executat la server)
app.use(expressLayouts);                            // suport pentru layout-uri - implicit fișierul care reprezintă template-ul site-ului este views/layout.ejs
app.use(express.static('public'))                   // directorul 'public' va conține toate resursele accesibile direct de către client (e.g., fișiere css, javascript, imagini)
app.use(bodyParser.json());                         // corpul mesajului poate fi interpretat ca json; datele de la formular se găsesc în format json în req.body
app.use(bodyParser.urlencoded({extended: true})); // utilizarea unui algoritm de deep parsing care suportă obiecte în obiecte
app.use(cookieParser());
app.use(session({
    key: 'user_sid',
    secret: 'secret',
    saveUninitialized: false,
    resave: false
}));

//load intrebari, users and produse
(async function () {
    listaIntrebari = await utilities.readFileAsync("data/intrebari.json");
    users = await utilities.readFileAsync("data/utilizatori.json");
    produse = await utilities.readFileAsync("data/movies.json");
})();

let ipDictFails = {};   //dict: ip -> numar_tentative_atac
let blackList = [];     //blocked ips

app.use((req, res, next) => {
    let client_ip = req.connection.remoteAddress;
    if (blackList.includes(client_ip)) {
        console.log("Ip " + client_ip + " is blocked.")
        res.send(404, "Wait for 30 seconds pls. You are blocked.");
    } else {
        next();
    }
});

app.get('/', async (req, res) => {
    console.log('cookies: ', req.cookies);
    let username = null, role = "";
    if (req.session.user) {
        username = req.session.user.prenume;
        role = req.session.user.role;
    }
    res.clearCookie('utilizator');
    let produse = await myDb.getItems();
    res.render('index', {user: username, produse: produse, role: role});
});


app.get('/register', (req, res) => {
    res.render('register');
});


app.post('/register', async (req, res) => {
    let user = req.body;
    console.log(user);
    if (user.password !== user.passwordConfirmation) {
        res.render("register", {messageError: "Parola nu corespunde la verificare"});
        return;
    }
    for (let index in users) {
        if (user.username === users[index]["utilizator"]) {
            res.render("register", {messageError: "User existent"});
            return;
        }
    }
    let new_user = {
        "utilizator": user.username,
        "parola": user.password,
        "nume": user.lastname,
        "prenume": user.firstname,
        "role": "user"
    }
    users.push(new_user);
    await utilities.writeFileAsync("data/utilizatori.json", new_user);
    res.redirect("autentificare");
});


app.get('/autentificare', (req, res) => {
    if (req.session.user) {   //if logged
        res.redirect("/");
        return;
    }
    let user = req.cookies["autentificare_user"];
    let username = null;
    if (user) {
        username = user["nume"];
    }
    let messageError = false;
    if (typeof req.cookies.messageError != "undefined" && req.cookies.messageError === "yes") {
        messageError = true;
        res.clearCookie("messageError");
    }
    res.render("autentificare", {user: username, messageError: messageError});
});


app.post('/verificare-autentificare', (req, res) => {
    let user = req.body;
    console.log("Verificare user: ", user);
    let username = user.login[0],
        password = user.login[1];
    for (let index in users) {
        if (username === users[index]["utilizator"] && password === users[index]["parola"]) {
            req.session.user = {}
            req.session.user.prenume = users[index]["prenume"];
            req.session.user.nume = users[index]["nume"];
            req.session.user.username = users[index]["utilizator"];
            req.session.user.role = users[index]["role"];
            res.cookie("autentificare_user", {nume: username});
            res.redirect("/");
            return;
        }
    }
    res.cookie("messageError", "yes");
    res.clearCookie("autentificare_user")
    res.redirect("/autentificare");
});


app.get('/log-out', (req, res) => {
    if (typeof req.session.user != "undefined") {
        console.log("Sesiune utilizator [Log-OUT]: ", req.session.user);
        req.session.user = undefined;
    }
    if (typeof req.session.cart != "undefined") {
        req.session.cart = undefined;
    }
    res.redirect('/');
});


app.get('/chestionar', (req, res) => {
    res.render('chestionar', {intrebari: listaIntrebari});
});


app.post('/rezultat-chestionar', (req, res) => {
    res.render('rezultat-chestionar', {intrebari: listaIntrebari, raspunsuri: JSON.stringify(req.body)});
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
    if (typeof req.session.user === "undefined") {   //if not logged
        res.redirect("/");
        return;
    }
    let detailed_items = []
    if (req.session.cart) {
        let array_elements = req.session.cart;
        console.log(array_elements);
        array_elements.sort();
        let current = null;
        let cnt = 0;
        for (let i = 0; i < array_elements.length; i++) {
            if (array_elements[i] !== current) {
                if (cnt > 0) {
                    let produs = await myDb.getProductById(current);
                    produs.cantitate = cnt;
                    detailed_items.push(produs);
                }
                current = array_elements[i];
                cnt = 1;
            } else {
                cnt++;
            }
        }
        if (cnt > 0) {
            let produs = await myDb.getProductById(current);
            produs.cantitate = cnt;
            detailed_items.push(produs);
        }
    }
    res.render("vizualizare-cos", {user: req.session.user.prenume, produse: detailed_items});
});


app.post('/adaugare_cos', (req, res) => {
    let item = req.body.id;
    console.log(item);
    if (typeof req.session.cart === "undefined") {
        req.session.cart = [];
    }
    req.session.cart.push(item);
    res.redirect("/");
});


app.get('/sterge_item', (req, res) => {
    let item = req.query.id;
    if (typeof req.session.cart === "undefined") {
        req.session.cart = [];
    }
    const index = req.session.cart.indexOf(item);
    if (index > -1) {
        req.session.cart.splice(index, 1);
    }
    res.redirect("/vizualizare-cos");
});


app.get('/admin', (req, res) => {
    if (typeof req.session.user != "undefined" && req.session.user.role === "admin") {
        res.render("admin");
        return;
    }
    res.sendStatus(403)
});


app.post('/upload_item', utilities.upload.single('photo'), async (req, res) => {
    if (typeof req.session.user != "undefined" && req.session.user.role === "admin") {
        let form = req.body;
        console.log(form);
        console.log(req.file);
        if (req.file && typeof form.price != "undefined" && typeof form.title != "undefined") {
            await myDb.insertProduct({"image": req.file.filename, "titlu": form.title, "price": form.price});
            res.redirect("/");
            return;
        } else throw 'error';
    }
    res.sendStatus(403)
});

const unblockIp = ((blockedIp) => function () {
    blackList.splice(blackList.indexOf(blockedIp), 1);
    console.log("Unblocked ip " + blockedIp);
});

//handle invalid urls
app.use((req, res) => {
    let client_ip = req.connection.remoteAddress;
    console.log("Client " + client_ip + " is requesting the resource: " + req.url);
    if (blackList.indexOf(client_ip) > -1) {
        return;
    }
    if (!ipDictFails[client_ip]) {
        ipDictFails[client_ip] = 0;
    }
    ipDictFails[client_ip]++;
    if (ipDictFails[client_ip] === 3) {
        ipDictFails[client_ip] = 0;
        blackList.push(client_ip);
        setTimeout(unblockIp(client_ip), 30000);
        console.log("Blocked ip " + client_ip);
        res.status(405).sendFile('404.png', {root: path.join(__dirname, 'public/images')});
    } else {
        res.redirect("/");
    }
});

app.listen(port, () => console.log(`Serverul rulează la adresa http://localhost:6789`));