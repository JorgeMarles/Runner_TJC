import { Request, Response } from 'express'
import { findTestCases, saveTestCases } from '../service/TestCasesServices';

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

export const find = async (req: Request, res: Response) => {
    try {
        const problem_id = req.query.problem_id;
        if (!problem_id) {
            res.status(400).json({ message: "The problem_id is required" });
            return;
        }
        if (typeof problem_id !== "string") {
            res.status(400).json({ message: "The problem_id must have only one data" });
            return;
        }
        findTestCases(problem_id, res);
    }
    catch (error: unknown) {
        console.log(error)
        if (error instanceof Error) {
            res.status(400).send({ isUploaded: false, message: error.message });
        }
        else {
            res.status(400).send({ isUploaded: false, message: "Something went wrong" });
        }
    }
};

