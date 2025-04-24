import { Request, Response } from 'express';
import JSZip from 'jszip';
import fs from 'fs';
import { ROOT_DIR } from '../config';
import path from 'path';

export const saveTestCases = async (req: Request, res: Response) => {
    try {
        const problem_id = req.body.problem_id;
        if (!problem_id) {
            return res.status(400).json({ message: "The problem_id is required" });
        }
        let inputsFile = undefined;
        if (req.files != undefined && "inputs" in req.files) {
            inputsFile = req.files["inputs"]?.[0];
        }
        let outputsFile = undefined;
        if (req.files != undefined && "outputs" in req.files) {
            outputsFile = req.files["outputs"]?.[0];
        }
        if (!inputsFile || !outputsFile) {
            return res.status(400).json({ message: "The inputs or outputs files don't exits in the request" });
        }
        try {
            const inputsZipData = fs.readFileSync(inputsFile.path);
            const outputsZipData = fs.readFileSync(outputsFile.path);

            const inputsZip = await JSZip.loadAsync(inputsZipData); 
            const outputsZip = await JSZip.loadAsync(outputsZipData);
            
            const inputFilenames = Object.keys(inputsZip.files);
            if (inputsZip.files.length != outputsZip.files.length) {
                return res.status(400).json({ message: "The number of inputs and outputs files don't match" });
            }
            for (let i = 0; i < inputFilenames.length; ++i) {
                const filename = path.basename(inputFilenames[i], path.extname(inputFilenames[i]));
                const inputEntry = inputsZip.files[filename + ".in"];
                const outputEntry = outputsZip.files[filename + ".out"];
                if (!inputEntry) {
                    return res.status(400).json({ message: "The input files must have the .in extension" });
                }
                if (!outputEntry) {
                    return res.status(400).json({ message: "The input file " + inputEntry.name + " don't have the same name in the output file" });
                }
                if (inputEntry.dir || outputEntry.dir) {
                    return res.status(400).json({ message: "The input and output files can't be directories" });
                }
            }

            const testCaseDir = path.join(ROOT_DIR, "testCases", `problem_${problem_id}`);
            fs.rmSync(testCaseDir, { recursive: true, force: true });
            fs.mkdirSync(path.join(testCaseDir, "/input"), { recursive: true });
            fs.mkdirSync(path.join(testCaseDir, "/output"), { recursive: true });

            for (let i = 0; i < inputFilenames.length; ++i) {
                const filename = path.basename(inputFilenames[i], path.extname(inputFilenames[i]));
                const inputEntry = inputsZip.files[filename + ".in"];
                const outputEntry = outputsZip.files[filename + ".out"];
                
                const inputData = await inputEntry.async("nodebuffer");
                const outputData = await outputEntry.async("nodebuffer");

                const inputFileName = `input_${i + 1}.in`;
                const outputFileName = `output_${i + 1}.out`;

                fs.writeFileSync(path.join(testCaseDir + "/input", inputFileName), inputData);
                fs.writeFileSync(path.join(testCaseDir + "/output", outputFileName), outputData);
            }

            fs.mkdirSync(path.join(`${ROOT_DIR}/uploads`, `problem_${problem_id}`), { recursive: true });	
            fs.copyFileSync(inputsFile.path, path.join(`${ROOT_DIR}/uploads`, `problem_${problem_id}`, `inputs.zip`));
            fs.copyFileSync(outputsFile.path, path.join(`${ROOT_DIR}/uploads`, `problem_${problem_id}`, `outputs.zip`));
            fs.rmSync(inputsFile.path);
            fs.rmSync(outputsFile.path);
            return res.status(200).json({ message: "Test cases processed successfully", problem_id });
        }
        catch (error: unknown) {
            if (error instanceof Error) {
                return res.status(500).json({ message: "Error processing the test cases", error: error.message });
            }
            else {
                return res.status(400).send({ isUploaded: false, message: "Something went wrong" });
            }
        }
    }
    catch (error: unknown) {
        if (error instanceof Error) {
            return res.status(400).send({ isUploaded: false, message: error.message });
        }
        else {
            return res.status(400).send({ isUploaded: false, message: "Something went wrong" });
        }
    }
};

export const findTestCases = async (problem_id: string, res: Response) => {
    try {
        const testCaseDir = path.join(`${ROOT_DIR}/uploads`, `problem_${problem_id}`);
        if (!fs.existsSync(testCaseDir)) {
            return res.status(400).json({ message: "The test cases for problem " + problem_id + " don't exist" });
        }
        const inputFiles = fs.readFileSync(path.join(testCaseDir, "inputs.zip"));
        const outputFiles = fs.readFileSync(path.join(testCaseDir, "output.zip"));
        
        return res.status(200).json({ inputs: inputFiles.toString('base64'), outputs: outputFiles.toString('base64') });
    } 
    catch (error) {
        if (error instanceof Error) {
            return res.status(500).json({ error: error.message });
        }
        else {
            return res.status(400).send({ isUploaded: false, message: "Something went wrong" });
        }
    }
}