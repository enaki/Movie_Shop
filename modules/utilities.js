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
    upload: multer({storage: storage})
}
