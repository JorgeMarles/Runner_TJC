export const languageMap: Record<string, { image: string; buildCommand: (fileName: string) => string; runCommand: (fileName: string) => string; ext: string; }> = {
    "python": {
        image: "python:3.10",
        buildCommand: (fileName: string) => "",
        runCommand: (fileName: string) => `python3 ${fileName}`,
        ext: ".py"
    },
    "cpp": {
        image: "gcc:latest",
        buildCommand: (fileName: string) => `g++ -std=c++23 ${fileName} -o program && `,
        runCommand: (fileName: string) => `./program`,
        ext: ".cpp"
    },
    "java": {
        image: "openjdk:17",
        buildCommand: (fileName: string) => `javac ${fileName} && `,
        runCommand: (fileName: string) => `java ${fileName.replace(".java", "")}`,
        ext: ".java"
    }
};