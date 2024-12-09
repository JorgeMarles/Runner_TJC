import { Request, Response } from 'express'
import { run } from '../service/RunnerServices';

export const runCode = async (req: Request, res: Response) => {
    try {
        run(req, res);
    } 
    catch (error) {
        console.error(error);
        if (error instanceof Error) {
            res.status(400).json({ success: false, message: error.message });
        }
    }
};

