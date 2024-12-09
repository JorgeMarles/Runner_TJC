import express from 'express';
import "reflect-metadata";
import bodyParser from 'body-parser';
import { PORT } from './config/index';
import cors from 'cors';
import { testCasesRouter } from './routers/TestCasesRouter';
import { runnerRouter } from './routers/RunnerRouter';

const app = express();

app.use(bodyParser.json());
app.use(cors());

app.use('/testCases', testCasesRouter);
app.use('/runner', runnerRouter);

app.listen(PORT, () => console.log(`Listening in port ${PORT}`));