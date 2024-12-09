import { Request, Response } from 'express'
import { saveTestCases } from '../service/TestCasesServices';

export const update = async (req: Request, res: Response) => {
    try {
        saveTestCases(req, res);
    } 
    catch (error) {
        console.error(error);
        if (error instanceof Error) {
            res.status(400).json({ success: false, message: error.message });
        }
    }
};

