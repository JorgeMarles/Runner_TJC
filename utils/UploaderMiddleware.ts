import multer from 'multer';
import fs from "fs";
import { ROOT_DIR } from '../config';
import { v4 as uuidv4 } from "uuid";
import path from 'path';
import { languageMap } from './LanguageMap';

if (!fs.existsSync(ROOT_DIR + "/uploads")) {
    fs.mkdirSync(ROOT_DIR + "/uploads");
}

if (!fs.existsSync(ROOT_DIR + "/tmp")) {
    fs.mkdirSync(ROOT_DIR + "/tmp");
}

const fileZipFilter = (req: any, file: any, cb: any) => {
    const ext = path.extname(file.originalname);
    if (ext !== '.zip') {
        return cb(new Error('Only .zip files are allowed'), false);
    }
    cb(null, true);
};

const fileLanguageFilter = (req: any, file: any, cb: any) => {
    const ext = path.extname(file.originalname);
    for (const language in languageMap) {
        if (languageMap[language].ext === ext) {
            req.body.language = language;
            return cb(null, true);
        }
    }
    return cb(new Error('Extention ' + ext + ' not supported'), false);
};

const storageTestCases = multer.diskStorage({
    destination: function(req, file, cb) {
        cb(null, ROOT_DIR + "/uploads");
    },
    filename: function(req, file, cb) {
        cb(null, "upload_" + uuidv4() + path.extname(file.originalname));
    }
});

const storageCode = multer.diskStorage({
    destination: function(req, file, cb) {
        cb(null, ROOT_DIR + "/tmp");
    },
    filename: function(req, file, cb) {
        cb(null, "tmp_" + uuidv4() + path.extname(file.originalname));
    }
});

export const testCasesUploader = multer({ 
    storage: storageTestCases,
    fileFilter: fileZipFilter,
    limits: { fileSize: 200 * 1024 * 1024 }
});

export const codeUploader = multer({ 
    storage: storageCode,
    fileFilter: fileLanguageFilter,
    limits: { fileSize: 50 * 1024 * 1024 }
});