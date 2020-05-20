const mongo = require('mongodb');
const url = "mongodb://localhost:27017/";
const MongoClient = mongo.MongoClient;
const ObjectId = mongo.ObjectID;

module.exports = {
    getItems: async function () {
        return new Promise((resolve, reject) => {
            MongoClient.connect(url, {useUnifiedTopology: true,}, function (err, db) {
                if (err) throw err;
                let dbo = db.db("cumparaturi");
                dbo.collection("produse").find({}).toArray(function (err, result) {
                    if (err) throw err;
                    resolve(result);
                    db.close();
                });
            });
        });
    },
    createDatabase: async function () {
        return new Promise((resolve, reject) => {
            MongoClient.connect(url, {useUnifiedTopology: true,}, function (err, db) {
                if (err) throw err;
                console.log("Database created!");
                let dbo = db.db("cumparaturi");
                dbo.collection("produse").drop(function (err, delOK) {
                    if (err) throw err;
                    if (delOK) console.log("Collection 'produse' deleted");
                    dbo.createCollection("produse", function (err, res) {
                        if (err) throw err;
                        console.log("Collection 'produse' created!");
                        resolve();
                        db.close();
                    });
                });
            });
        });
    },
    populateDatabase: async function (products) {
        return new Promise((resolve, reject) => {
            MongoClient.connect(url, {useUnifiedTopology: true,}, function (err, db) {
                if (err) throw err;
                let dbo = db.db("cumparaturi");
                dbo.collection("produse").drop(function (err, delOK) {
                    if (err) throw err;
                    if (delOK) console.log("Collection 'produse' deleted");
                    dbo.collection("produse").insertMany(products, function (err, res) {
                        if (err) throw err;
                        resolve();
                        db.close();
                    });
                });
            });
        });
    },
    insertProduct: async function (product) {
        return new Promise((resolve, reject) => {
            MongoClient.connect(url, {useUnifiedTopology: true,}, function (err, db) {
                if (err) throw err;
                let dbo = db.db("cumparaturi");
                dbo.collection("produse").insert(product, function (err, res) {
                    if (err) throw err;
                    resolve();
                    db.close();
                });
            });
        });
    },
    getProductById: async function (id) {
        return new Promise((resolve, reject) => {
            MongoClient.connect(url, {useUnifiedTopology: true,}, function (err, db) {
                if (err) throw err;
                let dbo = db.db("cumparaturi");
                let query = {"_id": ObjectId(id)};
                dbo.collection("produse").find(query).toArray(function (err, result) {
                    if (err) throw err;
                    if (result.length > 0) {
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