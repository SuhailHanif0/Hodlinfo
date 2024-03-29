import express from "express";
import axios from 'axios';
import mysql from 'mysql2/promise';
import cors from 'cors';

const app = express();
const PORT = 3000;


const pool = mysql.createPool({
    host: 'yourhost',
    user: 'username',
    password: 'password',
    database: 'databaseName',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});


axios.get('https://api.wazirx.com/api/v2/tickers').then(async (res) => {

    const tickers = {};

    const dataKeys = Object.keys(res.data);
    const keysToCopy = dataKeys.slice(0, 10);

    for (let i = 0; i < keysToCopy.length; i++) {
        const key = keysToCopy[i];
        tickers[key] = res.data[key];
    }


    try {
        const connection = await pool.getConnection();
    await connection.beginTransaction();

    const createTable = `CREATE TABLE IF NOT EXISTS tickers_table(platform varchar(60), ticker_name varchar(60), last_traded_price int, buy_price int, sell_price int, high int, low int)`;

    const insertQuery = `
    INSERT INTO tickers_table (platform, ticker_name, last_traded_price, buy_price, sell_price, high, low)
    VALUES ('WazirX', ?, ?, ?, ?, ?, ?)
`;

    await connection.query(createTable);

    for (const [tickerName, tickerData] of Object.entries(tickers)) {
    await connection.query(insertQuery, [tickerName, tickerData.last, tickerData.buy, tickerData.sell, tickerData.high, tickerData.low]);
}

await connection.commit();

        connection.release();
    } catch (err) {
        console.error('Error inserting data into MySQL:', err);
    }
});


const fetchTickersFromDB = async () => {
    try {
        const connection = await pool.getConnection();
        const [rows] = await connection.query('SELECT * FROM tickers_table');
        connection.release();
        return rows;
    } catch (err) {
        console.error('Error fetching data from MySQL:', err);
        throw err;
    }
};

app.use(cors());

app.get('/tickers', async (req, res) => {
    try {
        const tickersFromDB = await fetchTickersFromDB();
        res.status(200).json(tickersFromDB);
    } catch (err) {
        res.status(500).json({ error: 'Internal Server Error' });
    }
});


app.listen(PORT, () => {
    console.log(`Server is listening on http://localhost:${PORT}`);
});
