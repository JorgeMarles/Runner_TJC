import { Request, Response } from 'express';
import JSZip from 'jszip';
import fs from 'fs';
import { ROOT_DIR } from '../config';
import path from 'path';

export const saveTestCases = async (req: Request, res: Response) => {
    try {
        const problem_id = req.body.id_problem;
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
            if (path.extname(inputsFile.filename) != ".zip" || path.extname(outputsFile.filename) != ".zip") {
                return res.status(400).json({ message: "The inputs and outputs files must be ZIP files" });
            }
            const inputsZipData = fs.readFileSync(inputsFile.path);
            const outputsZipData = fs.readFileSync(outputsFile.path);

            const inputsZip = await JSZip.loadAsync(inputsZipData); 
            const outputsZip = await JSZip.loadAsync(outputsZipData);

            const testCaseDir = path.join(ROOT_DIR, "testCases", `problem_${problem_id}`);
            fs.mkdirSync(testCaseDir, { recursive: true });
            
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
                    return res.status(400).json({ message: "The input file " + inputEntry + " don't have the same name in the output file" });
                }
                if (inputEntry.dir || outputEntry.dir) {
                    return res.status(400).json({ message: "The input and output files can't be directories" });
                }
            }

            fs.rmSync(testCaseDir, { recursive: true, force: true });
            fs.mkdirSync(testCaseDir, { recursive: true });

            for (let i = 0; i < inputFilenames.length; ++i) {
                const filename = path.basename(inputFilenames[i], path.extname(inputFilenames[i]));
                const inputEntry = inputsZip.files[filename + ".in"];
                const outputEntry = outputsZip.files[filename + ".out"];
                
                const inputData = await inputEntry.async("nodebuffer");
                const outputData = await outputEntry.async("nodebuffer");

                const inputFileName = `input_${i + 1}.in`;
                const outputFileName = `output_${i + 1}.out`;

                fs.writeFileSync(path.join(testCaseDir, inputFileName), inputData);
                fs.writeFileSync(path.join(testCaseDir, outputFileName), outputData);
            }
            
            return res.status(200).json({ message: "Archivos ZIP procesados con éxito", problem_id });
        }
        catch (error: unknown) {
            if (error instanceof Error) {
                return res.status(500).json({ message: "Error al procesar los archivos ZIP", error: error.message });
            }
            else {
                return res.status(400).send({ isUploaded: false, message: "Something went wrong" });
            }
        }
    }
    catch (error: unknown) {
        console.log(error)
        if (error instanceof Error) {
            return res.status(400).send({ isUploaded: false, message: error.message });
        }
        else {
            return res.status(400).send({ isUploaded: false, message: "Something went wrong" });
        }
    }
};
