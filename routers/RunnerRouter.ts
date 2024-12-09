import express from 'express';
import { runCode } from '../controllers/RunnerController';
import { codeUploader } from '../utils/UploaderMiddleware';

export const runnerRouter = express.Router();

runnerRouter.post("/run", codeUploader.single("code"), runCode);