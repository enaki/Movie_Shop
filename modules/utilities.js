const fs = require('fs');
const multer = require('multer');

const storage = multer.diskStorage(
    {
        destination: './public/images',
        filename: function (req, file, cb) {
            //req.body is empty...
            //How could I get the new_file_name property sent from client here?
            cb(null, file.originalname + '-' + Date.now() + ".png");
        }
    }
);

module.exports = {
    readFileAsync: function (filename) {
        return new Promise((resolve, reject) => {
            fs.readFile(filename, function read(err, rawdata) {
                if (err) {
                    throw err;
                }
                resolve(JSON.parse(rawdata));
            });
        });
    },
    writeFileAsync: function (filename, user) {
        return new Promise((resolve, reject) => {
            fs.readFile(filename, 'utf8', function readFileCallback(err, data){
                if (err){
                    console.log(err);
                } else {
                    let obj = JSON.parse(data);
                    obj.push(user);
                    fs.writeFile(filename, JSON.stringify(obj), function(err){ if(err) throw err;});
                    resolve();
                }});
        });
    },
    upload: multer({storage: storage})
}
