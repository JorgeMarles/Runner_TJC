import { Request, Response } from 'express';
import { CodeExecutor } from '../utils/CodeExecutor';
import { ROOT_DIR } from "../config";
import path from "path";

export const run = async (req: Request, res: Response) => {
    try {
        const problem_id = req.body.problem_id;
        const timeout = req.body.timeout;
        const memoryLimit = req.body.memoryLimit;
        const language = req.body.language; 
        const user_id = req.body.user_id;
        if (!problem_id) {
            return res.status(400).json({ message: "The problem_id is required" });
        }
        if (!timeout) {
            return res.status(400).json({ message: "The timeout is required" });
        }
        if (!memoryLimit) {
            return res.status(400).json({ message: "The memoryLimit is required" });
        }
        if (!req.file) {
            return res.status(400).json({ message: "The code file don't exits in the request" });
        }
        if (!user_id) {
            return res.status(400).json({ message: "The user_id is required" });
        }
        try {
            const tempFilePath = req.file.path;
            const filename = req.file.filename;
            const codeExecutor = new CodeExecutor(filename);
            codeExecutor.executeCode({ user_id: user_id, problem_id: problem_id, language: language, timeout: timeout, memoryLimit: memoryLimit, filename: filename, tempFilePath: tempFilePath });
            return res.status(200).json({ message: "Code sent to executor succesfully", result: {
                id: codeExecutor.getId()
            } });
        }
        catch (error: unknown) {
            console.error(error)
            if (error instanceof Error) {
                return res.status(500).json({ message: "Runner error", error: error.message });
            }
            else {
                return res.status(400).send({ isExecuted: false, message: "Something went wrong" });
            }
        }
    }
    catch (error: unknown) {
        console.error(error)
        if (error instanceof Error) {
            return res.status(400).send({ isExecuted: false, message: error.message });
        }
        else {
            return res.status(400).send({ isExecuted: false, message: "Something went wrong" });
        }
    }
};
