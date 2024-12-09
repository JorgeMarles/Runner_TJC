import express from 'express';
import { update } from '../controllers/TestCasesController';
import { uploader } from '../utils/UploaderMiddleware';

export const testCasesRouter = express.Router();

testCasesRouter.post("/uploadTests", uploader.fields([{ name: "inputs", maxCount: 1 }, { name: "outputs", maxCount: 1 }]), update);