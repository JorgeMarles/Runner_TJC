import { Request, Response } from 'express';

export const run = async (req: Request, res: Response) => {
    try {
        const problem_id = req.body.id_problem;
        if (!problem_id) {
            return res.status(400).json({ message: "The problem_id is required" });
        }
        let code = undefined;
        if (!code) {
            return res.status(400).json({ message: "The code file don't exits in the request" });
        }
        try {
        
        }
        catch (error: unknown) {
            if (error instanceof Error) {
                return res.status(500).json({ message: "Runner error", error: error.message });
            }
            else {
                return res.status(400).send({ isExecuted: false, message: "Something went wrong" });
            }
        }
    }
    catch (error: unknown) {
        console.log(error)
        if (error instanceof Error) {
            return res.status(400).send({ isExecuted: false, message: error.message });
        }
        else {
            return res.status(400).send({ isExecuted: false, message: "Something went wrong" });
        }
    }
};
