export const languageMap: Record<string, { image: string; buildCommand: (filename: string) => string; runCommand: (filename: string, inputFilename: string) => string; ext: string; }> = {
    "python": {
        image: "python:3.10",
        buildCommand: (filename: string) => "",
        runCommand: (filename: string, inputFilename: string) => `python3 ${filename}`,
        ext: ".py"
    },
    "cpp": {
        image: "gcc:latest",
        buildCommand: (filename: string) => `g++ -std=c++23 /code/${filename} -o /code/program 2>&1`,
        runCommand: (filename: string, inputFilename: string) => `./code/program < ${inputFilename} 2>&1`,
        ext: ".cpp"
    },
    "java": {
        image: "openjdk:17",
        buildCommand: (filename: string) => `javac ${filename} && `,
        runCommand: (filename: string, inputFilename: string) => `java ${filename.replace(".java", "")}`,
        ext: ".java"
    }
};