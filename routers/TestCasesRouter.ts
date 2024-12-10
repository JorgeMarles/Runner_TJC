import express from 'express';
import { find, update } from '../controllers/TestCasesController';
import { testCasesUploader } from '../utils/UploaderMiddleware';
import multer from 'multer';

export const testCasesRouter = express.Router();

testCasesRouter.post("/uploadTests", testCasesUploader.fields([{ name: "inputs", maxCount: 1 }, { name: "outputs", maxCount: 1 }]), update);
testCasesRouter.get("/getTests", find);

testCasesRouter.use((error: any, req: any, res: any, next: any) => {
    if (error instanceof multer.MulterError) {
      return res.status(400).send({ message: `Multer error: ${error.message}` });
    }
    if (error instanceof Error) {
        return res.status(400).json({ success: false, message: error.message });
    }
    return res.status(500).send({ message: 'An unknown error occurred' });
});