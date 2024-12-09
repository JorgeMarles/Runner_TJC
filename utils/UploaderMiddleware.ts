import multer from 'multer';
import fs from "fs";
import { ROOT_DIR } from '../config';

if (!fs.existsSync(ROOT_DIR + "/uploads")) {
    fs.mkdirSync(ROOT_DIR + "/uploads");
}

const storage = multer.diskStorage({
    destination: function(req, file, cb) {
        cb(null, ROOT_DIR + "/uploads");
    },
    filename: function(req, file, cb) {
        cb(null, file.originalname);
    }
});

export const uploader = multer({ 
    storage: storage,
    limits: { fileSize: 50 * 1024 * 1024 }
});